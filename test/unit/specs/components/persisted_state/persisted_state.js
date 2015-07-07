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

      it('should append the child state to the parent, without parent value', function () {
        var childIndex = 'odd.keyname[]';
        var persistedState = new PersistedState();
        childState = persistedState.createChild(childIndex);

        // parent state should contain the child and its original state
        expect(childState.get()).to.eql({});

        // parent state should contain the child and its original empty state
        expect(persistedState.get()).to.eql(_.set({}, [childIndex], {}));
      });

      it('should append the child state to the parent, with parent value', function () {
        var childIndex = 'i can haz child';
        var childStateValue = {};
        var persistedStateValue = { original: true };
        var persistedState = new PersistedState(persistedStateValue);
        childState = persistedState.createChild(childIndex);

        // child state should be empty, we didn't give it any default data
        expect(childState.get()).to.eql(childStateValue);

        // parent state should contain the child and its original state value
        var compare = _.assign({}, persistedStateValue, _.set({}, [childIndex], childStateValue));
        expect(persistedState.get()).to.eql(compare);
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
        var compare = _.assign({}, persistedStateValue, _.set({}, [childIndex], childStateValue));
        expect(persistedState.get()).to.eql(compare);
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
        // parent should contain first child path, but not second
        expect(persistedState.get()).to.have.property(children[0].path);
        expect(persistedState.get()).to.not.have.property(children[1].path);
        // second child path should be inside the first child
        expect(children[0].instance.get()).to.have.property(children[1].path);
      });
    });

    describe('colliding child paths and parent state values', function () {
      it('should throw if the child path already exists');
    });
  });
});