import _ from 'lodash';
import sinon from 'sinon';
import noDigestPromises from 'test_utils/no_digest_promises';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { PersistedStateError } from 'ui/errors';
import 'ui/persisted_state';

let PersistedState;

describe('Persisted State Provider', function () {
  noDigestPromises.activateForSuite();

  beforeEach(function () {
    ngMock.module('kibana');

    ngMock.inject(function ($injector) {
      PersistedState = $injector.get('PersistedState');
    });
  });

  describe('state creation', function () {
    let persistedState;

    it('should create an empty state instance', function () {
      persistedState = new PersistedState();
      expect(persistedState.get()).to.eql({});
    });

    it('should create a state instance with data', function () {
      const val = { red: 'blue' };
      persistedState = new PersistedState(val);

      expect(persistedState.get()).to.eql(val);
      // ensure we get a copy of the state, not the actual state object
      expect(persistedState.get()).to.not.equal(val);
    });

    it('should create a copy of the state passed in', function () {
      const val = { red: 'blue' };
      persistedState = new PersistedState(val);

      expect(persistedState.get()).to.eql(val);
      expect(persistedState.get()).to.not.equal(val);
    });

    it('should not throw if creating valid child object', function () {
      const run = function () {
        const val = { red: 'blue' };
        const path = ['test.path'];
        const parent = new PersistedState();
        new PersistedState(val, path, parent);
      };

      expect(run).not.to.throwException();
    });

    it('should throw if given an invalid value', function () {
      const run = function () {
        const val = 'bananas';
        new PersistedState(val);
      };

      expect(run).to.throwException(function (err) {
        expect(err).to.be.a(PersistedStateError);
      });
    });

    it('should not throw if given primitive to child', function () {
      const run = function () {
        const val = 'bananas';
        const path = ['test.path'];
        const parent = new PersistedState();
        new PersistedState(val, path, parent);
      };

      expect(run).not.to.throwException();
    });

    it('should throw if given an invalid parent object', function () {
      const run = function () {
        const val = { red: 'blue' };
        const path = ['test.path'];
        const parent = {};
        new PersistedState(val, path, parent);
      };

      expect(run).to.throwException(function (err) {
        expect(err).to.be.a(PersistedStateError);
      });
    });

    it('should throw if given a parent without a path', function () {
      const run = function () {
        const val = { red: 'blue' };
        let path;
        const parent = new PersistedState();

        new PersistedState(val, path, parent);
      };

      expect(run).to.throwException(function (err) {
        expect(err).to.be.a(PersistedStateError);
      });
    });
  });

  describe('child state creation', function () {
    let childState;

    it('should not append the child state to the parent, without parent value', function () {
      const childIndex = 'i can haz child';
      const persistedState = new PersistedState();
      childState = persistedState.createChild(childIndex);

      // parent state should not contain the child state
      expect(persistedState.get()).to.not.have.property(childIndex);
      expect(persistedState.get()).to.eql({});
    });

    it('should not append the child state to the parent, with parent value', function () {
      const childIndex = 'i can haz child';
      const persistedStateValue = { original: true };
      const persistedState = new PersistedState(persistedStateValue);
      childState = persistedState.createChild(childIndex);

      // child state should be empty, we didn't give it any default data
      expect(childState.get()).to.be(undefined);

      // parent state should not contain the child state
      expect(persistedState.get()).to.not.have.property(childIndex);
      expect(persistedState.get()).to.eql(persistedStateValue);
    });

    it('should append the child state to the parent, with parent and child values', function () {
      const childIndex = 'i can haz child';
      const childStateValue = { tacos: 'yes please' };
      const persistedStateValue = { original: true };
      const persistedState = new PersistedState(persistedStateValue);
      childState = persistedState.createChild(childIndex, childStateValue);

      // parent state should contain the child and its original state value
      const parentState = persistedState.get();
      expect(parentState).to.have.property('original', true);
      expect(parentState).to.have.property(childIndex);
      expect(parentState[childIndex]).to.eql(childStateValue);
    });
  });

  describe('deep child state creation', function () {
    it('should delegate get/set calls to parent state', function () {
      const children = [{
        path: 'first*child',
        value: { first: true, second: false }
      }, {
        path: 'second child',
        value: { first: false, second: true }
      }];
      const persistedStateValue = { original: true };
      const persistedState = new PersistedState(persistedStateValue);

      // first child is a child of the parent persistedState
      children[0].instance = persistedState.createChild(children[0].path, children[0].value);
      // second child is a child of the first child
      children[1].instance = children[0].instance.createChild(children[1].path, children[1].value);

      // second child getter should only return second child value
      expect(children[1].instance.get()).to.eql(children[1].value);

      // parent should contain original props and first child path, but not the second child path
      const parentState = persistedState.get();
      _.keys(persistedStateValue).forEach(function (key) {
        expect(parentState).to.have.property(key);
      });
      expect(parentState).to.have.property(children[0].path);
      expect(parentState).to.not.have.property(children[1].path);

      // second child path should be inside the first child
      const firstChildState = children[0].instance.get();
      expect(firstChildState).to.have.property(children[1].path);
      expect(firstChildState[children[1].path]).to.eql(children[1].value);

      // check that the second child is still accessible from the parent instance
      const firstChild = persistedState.get(children[0].path);
      expect(firstChild).to.have.property(children[1].path);
    });
  });

  describe('child state removal', function () {
    it('should clear path from parent state', function () {
      const persistedState = new PersistedState();
      persistedState.createChild('child', { userId: 1234 });
      expect(persistedState.get()).to.eql({ child: { userId: 1234 } });
      persistedState.removeChild('child');
      expect(persistedState.get()).to.eql({});
    });

    it('should reset original parent value at path', function () {
      const persistedState = new PersistedState({ user: 1234 });
      persistedState.createChild('user', { id: 5678 });
      expect(persistedState.get()).to.eql({ user: { id: 5678 } });

      persistedState.removeChild('user');
      expect(persistedState.get()).to.eql({ user: 1234 });
    });

    it('should clear changedState', function () {
      const persistedState = new PersistedState({ user: 1234 });
      const childState = persistedState.createChild('user');
      childState.set('name', 'user name');
      expect(persistedState.getChanges()).to.eql({ user: { name: 'user name' } });

      persistedState.removeChild('user');
      expect(persistedState.getChanges()).to.eql({});
    });
  });

  describe('deep child state removal', function () {
    it('should clear path from parent state', function () {
      const persistedState = new PersistedState();
      persistedState.createChild('child.state', { userId: 1234 });
      expect(persistedState.get()).to.eql({ child: { state: { userId: 1234 } } });
      persistedState.removeChild('child.state');
      expect(persistedState.get()).to.eql({});
    });

    it('should reset original parent value at path', function () {
      const persistedState = new PersistedState({ user: { id: 1234 } });
      persistedState.createChild('user.id', 5678);
      expect(persistedState.get()).to.eql({ user: { id: 5678 } });

      persistedState.removeChild('user.id');
      expect(persistedState.get()).to.eql({ user: { id: 1234 } });
    });

    it('should reset original parent other values at path', function () {
      const persistedState = new PersistedState({ user: { name: 'user' } });
      persistedState.createChild('user.id', 5678);
      expect(persistedState.get()).to.eql({ user: { name: 'user', id: 5678 } });

      persistedState.removeChild('user.id');
      expect(persistedState.get()).to.eql({ user: { name: 'user' } });
    });

    it('should clear the changed state', function () {
      const persistedState = new PersistedState({ user: { id: 1234 } });
      const childState = persistedState.createChild('user.name');
      childState.set('user name');
      expect(persistedState.getChanges()).to.eql({ user: { name: 'user name' } });

      persistedState.removeChild('user.name');
      expect(persistedState.getChanges()).to.eql({});

    });
  });

  describe('child state conditions', function () {
    it('should be merged with the parent state', function () {
      const parent = new PersistedState({ name: 'test' });
      parent.createChild('child', 'value');
      expect(parent.get()).to.eql({
        name: 'test',
        child: 'value'
      });

      parent.set('id', 1234);
      expect(parent.get()).to.eql({
        id: 1234,
        name: 'test',
        child: 'value'
      });

      parent.set({});
      expect(parent.get()).to.eql({
        child: 'value'
      });
    });

    it('should give child state precedence', function () {
      const parent = new PersistedState({ user: { id: 1234, name: 'test' } });
      parent.createChild('user', { name: 'child test' });
      expect(parent.get()).to.eql({
        user: {
          id: 1234,
          name: 'child test'
        }
      });

      parent.set({});
      expect(parent.get()).to.eql({ user: { name: 'child test' } });
    });

    it('should be cleaned up with removeChild', function () {
      const parent = new PersistedState({ name: 'test' });
      parent.createChild('child', 'value');
      expect(parent.get()).to.eql({
        name: 'test',
        child: 'value'
      });

      parent.removeChild('child');
      expect(parent.get()).to.eql({
        name: 'test'
      });
    });
  });

  describe('colliding child paths and parent state values', function () {
    it('should not change the child path value by default', function () {
      const childIndex = 'childTest';
      const persistedStateValue = {};
      persistedStateValue[childIndex] = { overlapping_index: true };

      const persistedState = new PersistedState(persistedStateValue);
      let state = persistedState.get();
      expect(state).to.have.property(childIndex);
      expect(state[childIndex]).to.eql(persistedStateValue[childIndex]);

      const childState = persistedState.createChild(childIndex);
      expect(childState.get()).to.eql(persistedStateValue[childIndex]);

      // make sure the parent state is still the same
      state = persistedState.get();
      expect(state).to.have.property(childIndex);
      expect(state[childIndex]).to.eql(persistedStateValue[childIndex]);
    });

    it('should merge default child state', function () {
      const childIndex = 'childTest';
      const childStateValue = { child_index: false };
      const persistedStateValue = {};
      persistedStateValue[childIndex] = { parent_index: true };

      const persistedState = new PersistedState(persistedStateValue);
      let state = persistedState.get();
      expect(state).to.have.property(childIndex);
      expect(state[childIndex]).to.eql(persistedStateValue[childIndex]);

      // pass in child state value
      const childState = persistedState.createChild(childIndex, childStateValue);

      // parent's default state is merged with child state
      const compare = _.merge({}, childStateValue, persistedStateValue[childIndex]);
      expect(childState.get()).to.eql(compare);
      state = persistedState.get();
      expect(state).to.have.property(childIndex);
      expect(state[childIndex]).to.eql(compare);
    });
  });

  describe('mutation', function () {
    it('should not mutate the internal object', function () {
      const persistedStateValue = { hello: 'world' };
      const insertedObj = { farewell: 'cruel world' };
      const persistedState = new PersistedState(persistedStateValue);

      const obj = persistedState.get();
      _.assign(obj, insertedObj);

      expect(obj).to.have.property('farewell');
      expect(persistedState.get()).to.not.have.property('farewell');
    });
  });

  describe('JSON importing and exporting', function () {
    let persistedStateValue;

    beforeEach(function () {
      persistedStateValue = { one: 1, two: 2, 'meaning of life': 42 };
    });

    describe('exporting state to JSON', function () {
      it('should return the full JSON representation', function () {
        const persistedState = new PersistedState(persistedStateValue);

        const json = persistedState.toJSON();
        expect(json).to.eql(persistedStateValue);
      });

      it('should return the JSON representation of the child state', function () {
        const persistedState = new PersistedState(persistedStateValue);
        const childState = persistedState.createChild('awesome', { pants: false });

        expect(childState.toJSON()).to.eql({ pants: false });
        // verify JSON output of the parent state
        const parentCompare = _.assign({ awesome: { pants: false } }, persistedStateValue);
        expect(persistedState.toJSON()).to.eql(parentCompare);
      });

      it('should export stringified version of state', function () {
        const persistedState = new PersistedState(persistedStateValue);
        const childState = persistedState.createChild('awesome', { pants: false });

        const data = childState.toString();
        expect(JSON.parse(data)).to.eql({ pants: false });
        // verify JSON output of the parent state
        const parentCompare = _.assign({ awesome: { pants: false } }, persistedStateValue);
        expect(JSON.parse(persistedState.toString())).to.eql(parentCompare);
      });
    });

    describe('importing state from JSON string (hydration)', function () {
      it('should set the state from JSON string input', function () {
        const stateJSON = JSON.stringify(persistedStateValue);
        const persistedState = new PersistedState();
        expect(persistedState.get()).to.eql({});

        persistedState.fromString(stateJSON);
        expect(persistedState.get()).to.eql(persistedStateValue);
      });
    });
  });

  describe('get state', function () {
    it('should perform deep gets with various formats', function () {
      const obj = {
        red: {
          green: {
            blue: 'yellow'
          }
        },
        orange: [1, 2, false, 4],
        purple: {
          violet: ''
        }
      };
      const persistedState = new PersistedState(obj);
      expect(persistedState.get()).to.eql(obj);

      expect(persistedState.get('red')).to.eql({ green: { blue: 'yellow' } });
      expect(persistedState.get('red.green')).to.eql({ blue: 'yellow' });
      expect(persistedState.get('red[green]')).to.eql({ blue: 'yellow' });
      expect(persistedState.get(['red', 'green'])).to.eql({ blue: 'yellow' });
      expect(persistedState.get('red.green.blue')).to.eql('yellow');
      expect(persistedState.get('red[green].blue')).to.eql('yellow');
      expect(persistedState.get('red.green[blue]')).to.eql('yellow');
      expect(persistedState.get('red[green][blue]')).to.eql('yellow');
      expect(persistedState.get('red.green.blue')).to.eql('yellow');
      expect(persistedState.get('orange')).to.eql([1, 2, false, 4]);
      expect(persistedState.get('orange[0]')).to.equal(1);
      expect(persistedState.get('orange[2]')).to.equal(false);
      expect(persistedState.get('purple')).to.eql({ violet: '' });
    });

    it('should perform deep gets with arrays', function () {
      const persistedState = new PersistedState({ hello: { nouns: ['world', 'humans', 'everyone'] } });

      expect(persistedState.get()).to.eql({ hello: { nouns: ['world', 'humans', 'everyone'] } });
      expect(persistedState.get('hello')).to.eql({ nouns: ['world', 'humans', 'everyone'] });
      expect(persistedState.get('hello.nouns')).to.eql(['world', 'humans', 'everyone']);
    });

    it('should pass defaults to parent delegation', function () {
      const persistedState = new PersistedState({ parent: true });
      const childState = persistedState.createChild('child', { account: { name: 'first child' } });
      const defaultValue = 'i have no data';

      expect(childState.get('account.name', defaultValue)).to.eql('first child');
      expect(childState.get('account.age', defaultValue)).to.eql(defaultValue);
    });
  });

  describe('set state', function () {
    describe('path format support', function () {
      it('should create deep objects from dot notation', function () {
        const persistedState = new PersistedState();
        persistedState.set('one.two.three', 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects from array notation', function () {
        const persistedState = new PersistedState();
        persistedState.set('one[two][three]', 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects from arrays', function () {
        const persistedState = new PersistedState();
        persistedState.set(['one', 'two', 'three'], 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects with an existing path', function () {
        const persistedState = new PersistedState({}, 'deep.path');
        persistedState.set('green[red].blue', 4);
        expect(persistedState.get()).to.eql({ green: { red: { blue: 4 } } });
      });
    });

    describe('simple replace operations', function () {
      let persistedState;

      it('should replace value with string', function () {
        persistedState = new PersistedState({ hello: 'world' });
        expect(persistedState.get()).to.eql({ hello: 'world' });

        persistedState.set('hello', 'fare thee well');
        expect(persistedState.get()).to.eql({ hello: 'fare thee well' });
      });

      it('should replace value with array', function () {
        persistedState = new PersistedState({ hello: ['world', 'everyone'] });
        expect(persistedState.get()).to.eql({ hello: ['world', 'everyone'] });

        persistedState.set('hello', ['people']);
        expect(persistedState.get()).to.eql({ hello: ['people'] });
      });

      it('should replace value with object', function () {
        persistedState = new PersistedState({ hello: 'world' });
        expect(persistedState.get()).to.eql({ hello: 'world' });

        persistedState.set('hello', { message: 'fare thee well' });
        expect(persistedState.get()).to.eql({ hello: { message: 'fare thee well' } });
      });

      it('should replace value with object, removing old properties', function () {
        persistedState = new PersistedState({ hello: { message: 'world' } });
        expect(persistedState.get()).to.eql({ hello: { message: 'world' } });

        persistedState.set('hello', { length: 5 });
        expect(persistedState.get()).to.eql({ hello: { length: 5 } });
      });
    });

    describe('deep replace operations', function () {
      let persistedState;

      it('should append to the object', function () {
        persistedState = new PersistedState({ hello: { message: 'world' } });
        expect(persistedState.get()).to.eql({ hello: { message: 'world' } });

        persistedState.set('hello.length', 5);
        expect(persistedState.get()).to.eql({ hello: { message: 'world', length: 5 } });
      });

      it('should change the value in the array', function () {
        persistedState = new PersistedState({ hello: { nouns: ['world', 'humans', 'everyone'] } });
        persistedState.set('hello.nouns[1]', 'aliens');

        expect(persistedState.get()).to.eql({ hello: { nouns: ['world', 'aliens', 'everyone'] } });
        expect(persistedState.get('hello')).to.eql({ nouns: ['world', 'aliens', 'everyone'] });
        expect(persistedState.get('hello.nouns')).to.eql(['world', 'aliens', 'everyone']);
      });
    });
  });

  describe('internal state tracking', function () {
    it('should be an empty object', function () {
      const persistedState = new PersistedState();
      expect(persistedState._defaultState).to.eql({});
    });

    it('should store the default state value', function () {
      const val = { one: 1, two: 2 };
      const persistedState = new PersistedState(val);
      expect(persistedState._defaultState).to.eql(val);
    });

    it('should keep track of changes', function () {
      const val = { one: 1, two: 2 };
      const persistedState = new PersistedState(val);

      persistedState.set('two', 22);
      expect(persistedState._defaultState).to.eql(val);
      expect(persistedState._changedState).to.eql({ two: 22 });
    });
  });

  describe('events', function () {
    let persistedState;
    let emitter;

    const getByType = function (type, spy) {
      spy = spy || emitter;
      return spy.getCalls().filter(function (call) {
        return call.args[0] === type;
      });
    };

    const watchEmitter = function (state) {
      return sinon.spy(state, 'emit');
    };

    beforeEach(function () {
      persistedState = new PersistedState({ checker: { events: 'event tests' } });
      emitter = watchEmitter(persistedState);
    });

    it('should emit set when setting values', function () {
      expect(getByType('set')).to.have.length(0);
      persistedState.set('checker.time', 'now');
      expect(getByType('set')).to.have.length(1);
    });

    it('should not emit when setting value silently', function () {
      expect(getByType('set')).to.have.length(0);
      persistedState.setSilent('checker.time', 'now');
      expect(getByType('set')).to.have.length(0);
    });

    it('should emit change when changing values', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.set('checker.time', 'now');
      expect(getByType('change')).to.have.length(1);
    });

    it('should not emit when changing values silently', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.setSilent('checker.time', 'now');
      expect(getByType('change')).to.have.length(0);
    });

    it('should not emit change when values are identical', function () {
      expect(getByType('change')).to.have.length(0);
      // check both forms of setting the same value
      persistedState.set('checker', { events: 'event tests' });
      expect(getByType('change')).to.have.length(0);
      persistedState.set('checker.events', 'event tests');
      expect(getByType('change')).to.have.length(0);
    });

    it('should emit change when values change', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.set('checker.events', 'i changed');
      expect(getByType('change')).to.have.length(1);
    });

    it('should not emit change when createChild has no value', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.createChild('checker');
      expect(getByType('change')).to.have.length(0);
    });

    it('should not emit change when createChild is same value', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.createChild('checker', { events: 'event tests' });
      expect(getByType('change')).to.have.length(0);
      persistedState.createChild('checker.events', 'event tests');
      expect(getByType('change')).to.have.length(0);
    });

    it('should emit change when createChild changes existing value', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.createChild('checker', { events: 'changed via child' });
      expect(getByType('change')).to.have.length(1);
    });

    it('should not emit when createChild set to silent', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.createChild('checker', { events: 'changed via child' }, true);
      expect(getByType('change')).to.have.length(0);
    });

    it('should emit change when createChild adds new value', function () {
      expect(getByType('change')).to.have.length(0);
      persistedState.createChild('new.path', { another: 'thing' });
      expect(getByType('change')).to.have.length(1);
    });

    it('should emit on parent and child instances', function (done) {
      const child = persistedState.createChild('checker');
      expect(getByType('change')).to.have.length(0);

      // parent and child should emit, set up listener to test
      child.on('change', function () {
        // child fired, make sure parent fires as well
        expect(getByType('change')).to.have.length(1);
        done();
      });

      child.set('events', 'changed via child set');
    });
  });
});
