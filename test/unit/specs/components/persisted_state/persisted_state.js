define(function (require) {
  var _ = require('lodash');
  var sinon = require('sinon/sinon');

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
    });

    describe('child state creation', function () {
      var childState;
      var persistedState;

      it('should append the child state to the parent, without parent value', function () {
        var childIndex = 'odd.keyname[]';
        persistedState = new PersistedState();
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
        persistedState = new PersistedState(persistedStateValue);
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
        persistedState = new PersistedState(persistedStateValue);
        childState = persistedState.createChild(childIndex, childStateValue);

        // child state should be empty, we didn't give it any default data
        expect(childState.get()).to.eql(childStateValue);

        // parent state should contain the child and its original state value
        var compare = _.assign({}, persistedStateValue, _.set({}, [childIndex], childStateValue));
        expect(persistedState.get()).to.eql(compare);
      });
    });
  });
});