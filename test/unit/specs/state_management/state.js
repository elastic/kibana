define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  require('services/private');

  // Load kibana
  require('index');

  describe('State Management', function () {
    describe('State', function () {

      var $rootScope, $location, State, Events;

      beforeEach(function () {
        module('kibana');

        inject(function (_$rootScope_, _$location_, Private) {
          $location = _$location_;
          $rootScope = _$rootScope_;
          State = Private(require('components/state_management/state'));
          Events = Private(require('factories/events'));
        });
      });

      it('should inherit from Events', function () {
        var state = new State();
        expect(state).to.be.an(Events);
      });

      it('should save to $location.search()', function () {
        var state = new State('_s', { test: 'foo' });
        state.save();
        var search = $location.search();
        expect(search).to.have.property('_s');
        expect(search._s).to.equal('(test:foo)');
      });

      it('should emit an event if changes are saved', function (done) {
        var state = new State();
        state.on('save_with_changes', function (keys) {
          expect(keys).to.eql(['test']);
          done();
        });
        state.test = 'foo';
        state.save();
        var search = $location.search();
        $rootScope.$apply();
      });


      it('should emit an event if changes are fetched', function (done) {
        var state = new State();
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
        var state = new State();
        state.on('test', function (message) {
          expect(message).to.equal('foo');
          done();
        });
        state.emit('test', 'foo');
        $rootScope.$apply();
      });

      it('should fire listeners for #onUpdate() on #fetch()', function (done) {
        var state = new State();
        state.onUpdate(function (keys) {
          expect(keys).to.eql(['foo']);
          done();
        });
        $location.search({ _s: '(foo:bar)' });
        state.fetch();
        expect(state).to.have.property('foo', 'bar');
        $rootScope.$apply();
      });

      it('should apply defaults to fetches', function () {
        var state = new State('_s', { message: 'test' });
        $location.search({ _s: '(foo:bar)' });
        state.fetch();
        expect(state).to.have.property('foo', 'bar');
        expect(state).to.have.property('message', 'test');
      });

      it('should reset the state to the defaults', function () {
        var state = new State('_s', { message: ['test'] });
        state.reset();
        var search = $location.search();
        expect(search).to.have.property('_s');
        expect(search._s).to.equal('(message:!(test))');
        expect(state.message).to.eql(['test']);
      });

      it('should apply the defaults upon initialization', function () {
        var state = new State('_s', { message: 'test' });
        expect(state).to.have.property('message', 'test');
      });

      it('should call fetch when $routeUpdate is fired on $rootScope', function () {
        var state = new State();
        var spy = sinon.spy(state, 'fetch');
        $rootScope.$emit('$routeUpdate', 'test');
        sinon.assert.calledOnce(spy);
      });

    });
  });

});
