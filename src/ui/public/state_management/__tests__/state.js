import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { encode as encodeRison } from 'rison-node';
import 'ui/private';
import { Notifier } from 'ui/notify/notifier';
import { StateProvider } from 'ui/state_management/state';
import {
  unhashQueryString,
} from 'ui/state_management/state_hashing';
import {
  createStateHash,
  isStateHash,
} from 'ui/state_management/state_storage';
import { HashedItemStore } from 'ui/state_management/state_storage/hashed_item_store';
import StubBrowserStorage from 'test_utils/stub_browser_storage';
import { EventsProvider } from 'ui/events';

describe('State Management', function () {
  const notifier = new Notifier();
  let $rootScope;
  let $location;
  let State;
  let Events;
  let setup;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$rootScope_, _$location_, Private, config) {
    $location = _$location_;
    $rootScope = _$rootScope_;
    State = Private(StateProvider);
    Events = Private(EventsProvider);
    Notifier.prototype._notifs.splice(0);

    setup = opts => {
      const { param, initial, storeInHash } = (opts || {});
      sinon.stub(config, 'get').withArgs('state:storeInSessionStorage').returns(!!storeInHash);
      const store = new StubBrowserStorage();
      const hashedItemStore = new HashedItemStore(store);
      const state = new State(param, initial, hashedItemStore, notifier);

      const getUnhashedSearch = state => {
        return unhashQueryString($location.search(), [ state ]);
      };

      return { notifier, store, hashedItemStore, state, getUnhashedSearch };
    };
  }));

  afterEach(() => Notifier.prototype._notifs.splice(0));

  describe('Provider', function () {
    it('should reset the state to the defaults', function () {
      const { state, getUnhashedSearch } = setup({ initial: { message: ['test'] } });
      state.reset();
      const search = getUnhashedSearch(state);
      expect(search).to.have.property('_s');
      expect(search._s).to.equal('(message:!(test))');
      expect(state.message).to.eql(['test']);
    });

    it('should apply the defaults upon initialization', function () {
      const { state } = setup({ initial: { message: 'test' } });
      expect(state).to.have.property('message', 'test');
    });

    it('should inherit from Events', function () {
      const { state } = setup();
      expect(state).to.be.an(Events);
    });

    it('should emit an event if reset with changes', function (done) {
      const { state } = setup({ initial: { message: ['test'] } });
      state.on('reset_with_changes', function (keys) {
        expect(keys).to.eql(['message']);
        done();
      });
      state.save();
      state.message = 'foo';
      state.reset();
      $rootScope.$apply();
    });

    it('should not emit an event if reset without changes', function () {
      const { state } = setup({ initial: { message: 'test' } });
      state.on('reset_with_changes', function () {
        expect().fail();
      });
      state.save();
      state.message = 'test';
      state.reset();
      $rootScope.$apply();
    });
  });

  describe('Search', function () {
    it('should save to $location.search()', function () {
      const { state, getUnhashedSearch } = setup({ initial: { test: 'foo' } });
      state.save();
      const search = getUnhashedSearch(state);
      expect(search).to.have.property('_s');
      expect(search._s).to.equal('(test:foo)');
    });

    it('should emit an event if changes are saved', function (done) {
      const { state, getUnhashedSearch } = setup();
      state.on('save_with_changes', function (keys) {
        expect(keys).to.eql(['test']);
        done();
      });
      state.test = 'foo';
      state.save();
      getUnhashedSearch(state);
      $rootScope.$apply();
    });
  });

  describe('Fetch', function () {
    it('should emit an event if changes are fetched', function (done) {
      const { state } = setup();
      state.on('fetch_with_changes', function (keys) {
        expect(keys).to.eql(['foo']);
        done();
      });
      $location.search({ _s: '(foo:bar)' });
      state.fetch();
      expect(state).to.have.property('foo', 'bar');
      $rootScope.$apply();
    });

    it('should have events that attach to scope', function (done) {
      const { state } = setup();
      state.on('test', function (message) {
        expect(message).to.equal('foo');
        done();
      });
      state.emit('test', 'foo');
      $rootScope.$apply();
    });

    it('should fire listeners for #onUpdate() on #fetch()', function (done) {
      const { state } = setup();
      state.on('fetch_with_changes', function (keys) {
        expect(keys).to.eql(['foo']);
        done();
      });
      $location.search({ _s: '(foo:bar)' });
      state.fetch();
      expect(state).to.have.property('foo', 'bar');
      $rootScope.$apply();
    });

    it('should apply defaults to fetches', function () {
      const { state } = setup({ initial: { message: 'test' } });
      $location.search({ _s: '(foo:bar)' });
      state.fetch();
      expect(state).to.have.property('foo', 'bar');
      expect(state).to.have.property('message', 'test');
    });

    it('should call fetch when $routeUpdate is fired on $rootScope', function () {
      const { state } = setup();
      const spy = sinon.spy(state, 'fetch');
      $rootScope.$emit('$routeUpdate', 'test');
      sinon.assert.calledOnce(spy);
    });

    it('should clear state when missing form URL', function () {
      let stateObj;
      const { state } = setup();

      // set state via URL
      $location.search({ _s: '(foo:(bar:baz))' });
      state.fetch();
      stateObj = state.toObject();
      expect(stateObj).to.eql({ foo: { bar: 'baz' } });

      // ensure changing URL changes state
      $location.search({ _s: '(one:two)' });
      state.fetch();
      stateObj = state.toObject();
      expect(stateObj).to.eql({ one: 'two' });

      // remove search, state should be empty
      $location.search({});
      state.fetch();
      stateObj = state.toObject();
      expect(stateObj).to.eql({});
    });

    it('does not replace the state value on read', () => {
      const { state } = setup();
      sinon.stub($location, 'search', (newSearch) => {
        if (newSearch) {
          return $location;
        } else {
          return {
            [state.getQueryParamName()]: '(a:1)'
          };
        }
      });
      const replaceStub = sinon.stub($location, 'replace').returns($location);

      state.fetch();
      sinon.assert.notCalled(replaceStub);
    });
  });

  describe('Hashing', () => {
    it('stores state values in a hashedItemStore, writing the hash to the url', () => {
      const { state, hashedItemStore } = setup({ storeInHash: true });
      state.foo = 'bar';
      state.save();
      const urlVal = $location.search()[state.getQueryParamName()];

      expect(isStateHash(urlVal)).to.be(true);
      expect(hashedItemStore.getItem(urlVal)).to.eql(JSON.stringify({ foo: 'bar' }));
    });

    it('should replace rison in the URL with a hash', () => {
      const { state, hashedItemStore } = setup({ storeInHash: true });
      const obj = { foo: { bar: 'baz' } };
      const rison = encodeRison(obj);

      $location.search({ _s: rison });
      state.fetch();

      const urlVal = $location.search()._s;
      expect(urlVal).to.not.be(rison);
      expect(isStateHash(urlVal)).to.be(true);
      expect(hashedItemStore.getItem(urlVal)).to.eql(JSON.stringify(obj));
    });

    describe('error handling', () => {
      it('notifies the user when a hash value does not map to a stored value', () => {
        const { state, notifier } = setup({ storeInHash: true });
        const search = $location.search();
        const badHash = createStateHash('{"a": "b"}', () => null);

        search[state.getQueryParamName()] = badHash;
        $location.search(search);

        expect(notifier._notifs).to.have.length(0);
        state.fetch();
        expect(notifier._notifs).to.have.length(1);
        expect(notifier._notifs[0].content).to.match(/use the share functionality/i);
      });

      it('presents fatal error linking to github when setting item fails', () => {
        const { state, hashedItemStore, notifier } = setup({ storeInHash: true });
        const fatalStub = sinon.stub(notifier, 'fatal').throws();
        sinon.stub(hashedItemStore, 'setItem').returns(false);

        expect(() => {
          state.toQueryParam();
        }).to.throwError();

        sinon.assert.calledOnce(fatalStub);
        expect(fatalStub.firstCall.args[0]).to.be.an(Error);
        expect(fatalStub.firstCall.args[0].message).to.match(/github\.com/);
      });
    });
  });
});
