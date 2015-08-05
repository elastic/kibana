var _ = require('lodash');
var sinon = require('auto-release-sinon');
var ngMock = require('ngMock');
var expect = require('expect.js');
var errors = require('ui/errors');

var PersistedState;

describe('Persisted State', function () {
  beforeEach(function () {
    ngMock.module('kibana');

    ngMock.inject(function (Private) {
      PersistedState = Private(require('ui/persisted_state/persisted_state'));
    });
  });

  describe('state creation', function () {
    var persistedState;

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
        new PersistedState(val);
      };

      expect(run).to.throwException(function (err) {
        expect(err).to.be.a(errors.PersistedStateError);
      });
    });

    it('should not throw if given primitive to child', function () {
      var run = function () {
        var val = 'bananas';
        var path = ['test.path'];
        var parent = new PersistedState();
        new PersistedState(val, path, parent);
      };

      expect(run).not.to.throwException();
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
        path: 'second child',
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

    it('should merge default child state', function () {
      var childIndex = 'childTest';
      var childStateValue = { child_index: false };
      var persistedStateValue = {};
      persistedStateValue[childIndex] = { parent_index: true };

      var persistedState = new PersistedState(persistedStateValue);
      var state = persistedState.get();
      expect(state).to.have.property(childIndex);
      expect(state[childIndex]).to.eql(persistedStateValue[childIndex]);

      // pass in child state value
      var childState = persistedState.createChild(childIndex, childStateValue);

      // parent's default state overrides child state
      var compare = _.merge({}, childStateValue, persistedStateValue[childIndex]);
      expect(childState.get()).to.eql(compare);
      state = persistedState.get();
      expect(state).to.have.property(childIndex);
      expect(state[childIndex]).to.eql(compare);
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
      expect(persistedState.get()).to.not.have.property('farewell');
    });
  });

  describe('JSON importing and exporting', function () {
    var persistedStateValue;

    beforeEach(function () {
      persistedStateValue = { one: 1, two: 2, 'meaning of life': 42 };
    });

    describe('exporting state to JSON', function () {
      it('should return the full JSON representation', function () {
        var persistedState = new PersistedState(persistedStateValue);

        var json = persistedState.toJSON();
        expect(json).to.eql(persistedStateValue);
      });

      it('should return the JSON representation of the child state', function () {
        var persistedState = new PersistedState(persistedStateValue);
        var childState = persistedState.createChild('awesome', { pants: false });

        expect(childState.toJSON()).to.eql({ pants: false });
        // verify JSON output of the parent state
        var parentCompare = _.assign({ awesome: { pants: false }}, persistedStateValue);
        expect(persistedState.toJSON()).to.eql(parentCompare);
      });

      it('should export stringified version of state', function () {
        var persistedState = new PersistedState(persistedStateValue);
        var childState = persistedState.createChild('awesome', { pants: false });

        var data = childState.toString();
        expect(JSON.parse(data)).to.eql({ pants: false });
        // verify JSON output of the parent state
        var parentCompare = _.assign({ awesome: { pants: false }}, persistedStateValue);
        expect(JSON.parse(persistedState.toString())).to.eql(parentCompare);
      });
    });

    describe('importing state from JSON string (hydration)', function () {
      it('should set the state from JSON string input', function () {
        var stateJSON = JSON.stringify(persistedStateValue);
        var persistedState = new PersistedState();
        expect(persistedState.get()).to.eql({});

        persistedState.fromString(stateJSON);
        expect(persistedState.get()).to.eql(persistedStateValue);
      });
    });
  });

  describe('get state', function () {
    it('should perform deep gets with vairous formats', function () {
      var obj = {
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
      var persistedState = new PersistedState(obj);
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
      var persistedState = new PersistedState({ hello: { nouns: ['world', 'humans', 'everyone'] } });

      expect(persistedState.get()).to.eql({ hello: { nouns: ['world', 'humans', 'everyone'] } });
      expect(persistedState.get('hello')).to.eql({ nouns: ['world', 'humans', 'everyone'] });
      expect(persistedState.get('hello.nouns')).to.eql(['world', 'humans', 'everyone']);
    });
  });

  describe('set state', function () {
    describe('path format support', function () {
      it('should create deep objects from dot notation', function () {
        var persistedState = new PersistedState();
        persistedState.set('one.two.three', 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects from array notation', function () {
        var persistedState = new PersistedState();
        persistedState.set('one[two][three]', 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects from arrays', function () {
        var persistedState = new PersistedState();
        persistedState.set(['one', 'two', 'three'], 4);
        expect(persistedState.get()).to.eql({ one: { two: { three: 4 } } });
      });

      it('should create deep objects with an existing path', function () {
        var persistedState = new PersistedState({}, 'deep.path');
        persistedState.set('green[red].blue', 4);
        expect(persistedState.get()).to.eql({ green: { red: { blue: 4 } }});
      });
    });

    describe('simple replace operations', function () {
      var persistedState;

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
        expect(persistedState.get()).to.eql({ hello: { length: 5 }});
      });
    });

    describe('deep replace operations', function () {
      var persistedState;

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

  describe('save state', function () {
    var saveStub;

    function makeState(val, path) {
      var state;
      if (path) state = new PersistedState(val, path);
      else state = new PersistedState(val);

      saveStub = sinon.stub(state, '_saveState');
      return state;
    }

    it('should not save default parent state', function () {
      var persistedState = makeState({ one: 1, two: 2});

      persistedState.save();
      expect(saveStub.callCount).to.equal(1);
      expect(saveStub.firstCall.args[0]).to.eql({});
    });

    it('should only save changed values', function () {
      var persistedState = makeState({ one: 1, two: 2});

      persistedState.set('one.two', 'three');
      persistedState.save();
      expect(saveStub.callCount).to.equal(1);
      expect(saveStub.firstCall.args[0]).to.eql({ one: { two: 'three' }});
    });

    it('should not save default child state', function () {
      var persistedState = makeState({ one: 1, two: 2});
      persistedState.createChild('child_path', 'child_value');

      persistedState.save();
      expect(saveStub.callCount).to.equal(1);
      expect(saveStub.firstCall.args[0]).to.eql({});
    });

    it('should only save changed child values', function () {
      var persistedState = makeState({ one: 1, two: 2});
      var child = persistedState.createChild('child_path', 'child_value');
      child.set('me[gusta]', 'cosas deliciosas');
      persistedState.save();
      expect(saveStub.callCount).to.equal(1);
      expect(saveStub.firstCall.args[0]).to.eql({
        child_path: {
          me: { gusta: 'cosas deliciosas' }
        }
      });
    });
  });

  describe('internal state tracking', function () {
    it('should be an empty object', function () {
      var persistedState = new PersistedState();
      expect(persistedState._defaultState).to.eql({});
    });

    it('should store the default state value', function () {
      var val = { one: 1, two: 2 };
      var persistedState = new PersistedState(val);
      expect(persistedState._defaultState).to.eql(val);
    });

    it('should keep track of changes', function () {
      var val = { one: 1, two: 2 };
      var persistedState = new PersistedState(val);

      persistedState.set('two', 22);
      expect(persistedState._defaultState).to.eql(val);
      expect(persistedState._changedState).to.eql({ two: 22 });
    });
  });
});
