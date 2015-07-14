define(function (require) {
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  var errors = require('errors');

  var PersistedState;

  describe('Persisted State', function () {
    this.timeout(false);

    beforeEach(function () {
      module('kibana');

      inject(function (Private) {
        PersistedState = Private(require('components/persisted_state/persisted_state'));
      });
    });

    describe('state creation', function () {
      var persistedState;

      afterEach(function () {
        expect(persistedState._state).to.be.an(Object);
      });

      it('should create an empty state instance', function () {
        persistedState = new PersistedState();
        expect(persistedState.get()).to.eql({});
      });

      it('should create a state instance with data', function () {
        var val = { red: 'blue' };
        persistedState = new PersistedState(val);

        expect(persistedState.get()).to.eql(val);
        // ensure we get a copy of the state, not the actual state object
        expect(persistedState.get()).to.not.equal(val);
      });

      it('should create a state instance with a path', function () {
        var val = { red: 'blue' };
        var path = 'test.path';
        var compare = _.set({}, [path], val);
        persistedState = new PersistedState(val, path);

        expect(persistedState.get()).to.eql(val);
        // ensure this is a copy of the object
        expect(persistedState.get()).to.not.equal(val);
      });

      it('should not throw if creating valid child object', function () {
        var run = function () {
          var val = { red: 'blue' };
          var path = ['test.path'];
          var parent = new PersistedState();
          new PersistedState(val, path, parent);
        };

        expect(run).not.to.throwException();
      });

      it('should throw if given an invalid value', function () {
        var run = function () {
          var val = 'bananas';
          var path = ['test.path'];
          var parent = new PersistedState();
          new PersistedState(val, path, parent);
        };

        expect(run).to.throwException(function (err) {
          expect(err).to.be.a(errors.PersistedStateError);
        });
      });

      it('should throw if given an invalid parent object', function () {
        var run = function () {
          var val = { red: 'blue' };
          var path = ['test.path'];
          var parent = {};
          new PersistedState(val, path, parent);
        };

        expect(run).to.throwException(function (err) {
          expect(err).to.be.a(errors.PersistedStateError);
        });
      });

      it('should throw if given a parent without a path', function () {
        var run = function () {
          var val = { red: 'blue' };
          var path;
          var parent = new PersistedState();

          new PersistedState(val, path, parent);
        };

        expect(run).to.throwException(function (err) {
          expect(err).to.be.a(errors.PersistedStateError);
        });
      });
    });

    describe('child state creation', function () {
      var childState;

      it('should not append the child state to the parent, without parent value', function () {
        var childIndex = 'odd.keyname[]';
        var persistedState = new PersistedState();
        childState = persistedState.createChild(childIndex);

        // parent state should contain the child and its original state
        expect(persistedState.get()).to.not.have.property(childIndex);
      });

      it('should not append the child state to the parent, with parent value', function () {
        var childIndex = 'i can haz child';
        var childStateValue = {};
        var persistedStateValue = { original: true };
        var persistedState = new PersistedState(persistedStateValue);
        childState = persistedState.createChild(childIndex);

        // child state should be empty, we didn't give it any default data
        expect(childState.get()).to.be(undefined);

        // parent state should contain the child and its original state value
        expect(persistedState.get()).to.not.have.property(childIndex);
      });

      it('should append the child state to the parent, with parent and child values', function () {
        var childIndex = 'i can haz child';
        var childStateValue = { tacos: 'yes please' };
        var persistedStateValue = { original: true };
        var persistedState = new PersistedState(persistedStateValue);
        childState = persistedState.createChild(childIndex, childStateValue);

        // child state should be empty, we didn't give it any default data
        expect(childState.get()).to.eql(childStateValue);

        // parent state should contain the child and its original state value
        var parentState = persistedState.get();
        expect(parentState).to.have.property('original', true);
        expect(parentState).to.have.property(childIndex);
        expect(parentState[childIndex]).to.eql(childStateValue);
      });
    });

    describe('deep child state creation', function () {
      it('should delegate get/set calls to parent state', function () {
        var children = [{
          path: 'first*child',
          value: { first: true, second: false }
        }, {
          path: 'second[child]',
          value: { first: false, second: true }
        }];
        var persistedStateValue = { original: true };
        var persistedState = new PersistedState(persistedStateValue);

        // first child is a child of the parent persistedState
        children[0].instance = persistedState.createChild(children[0].path, children[0].value);
        // second child is a child of the first child
        children[1].instance = children[0].instance.createChild(children[1].path, children[1].value);

        // second child getter should only return second child value
        expect(children[1].instance.get()).to.eql(children[1].value);

        // parent should contain original props and first child path, but not the second child path
        var parentState = persistedState.get();
        _.keys(persistedStateValue).forEach(function (key) {
          expect(parentState).to.have.property(key);
        });
        expect(parentState).to.have.property(children[0].path);
        expect(parentState).to.not.have.property(children[1].path);

        // second child path should be inside the first child
        var firstChildState = children[0].instance.get();
        expect(firstChildState).to.have.property(children[1].path);
        expect(firstChildState[children[1].path]).to.eql(children[1].value);
      });
    });

    describe('colliding child paths and parent state values', function () {
      it('should not change the child path value by default', function () {
        var childIndex = 'childTest';
        var persistedStateValue = {};
        persistedStateValue[childIndex] = { overlapping_index: true };

        var persistedState = new PersistedState(persistedStateValue);
        var state = persistedState.get();
        expect(state).to.have.property(childIndex);
        expect(state[childIndex]).to.eql(persistedStateValue[childIndex]);

        var childState = persistedState.createChild(childIndex);
        expect(childState.get()).to.eql(persistedStateValue[childIndex]);

        // make sure the parent state is still the same
        state = persistedState.get();
        expect(state).to.have.property(childIndex);
        expect(state[childIndex]).to.eql(persistedStateValue[childIndex]);
      });

      it('should clobber data if the child path already', function () {
        var childIndex = 'childTest';
        var childStateValue = { clobbered_index: true };
        var persistedStateValue = {};
        persistedStateValue[childIndex] = { overlapping_index: true };

        var persistedState = new PersistedState(persistedStateValue);
        var state = persistedState.get();
        expect(state).to.have.property(childIndex);
        expect(state[childIndex]).to.eql(persistedStateValue[childIndex]);

        // pass in chidl state value
        var childState = persistedState.createChild(childIndex, childStateValue);
        expect(childState.get()).to.eql(childStateValue);
        // ensure original object is not mutated
        expect(persistedStateValue[childIndex]).to.not.eql(childStateValue);

        // make sure the parent state matches the passed child state
        state = persistedState.get();
        expect(state).to.have.property(childIndex);
        expect(state[childIndex]).to.eql(childStateValue);
      });
    });

    describe('mutation', function () {
      it('should not mutate the internal object', function () {
        var persistedStateValue = { hello: 'world' };
        var insertedObj = { farewell: 'cruel world' };
        var persistedState = new PersistedState(persistedStateValue);

        var obj = persistedState.get();
        _.assign(obj, insertedObj);

        expect(obj).to.have.property('farewell');
        expect(persistedState._state).to.not.have.property('farewell');
      });
    });
  });
});