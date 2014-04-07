define(function (require) {
  var angular = require('angular');
  var mocks = require('angular-mocks');
  var _ = require('lodash');
  var $ = require('jquery');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the directive
  require('services/state');

  describe('State service', function () {
    var state, location;

    beforeEach(function () {
      module('kibana/services');

      // Create the scope
      inject(function (_state_, $location) {

        state = _state_;
        location = $location;

      });

    });

    afterEach(function () {
      location.search({});
    });

    it('should have no state by default', function (done) {
      expect(state.get()).to.eql({});
      done();
    });

    it('should have a set(Object) that writes state to the search string', function (done) {
      state.set({foo: 'bar'});
      expect(location.search()._r).to.be('(foo:bar)');
      done();
    });

    it('should have a get() that deserializes rison from the search string', function (done) {
      location.search({_r: '(foo:bar)'});
      expect(state.get()).to.eql({foo: 'bar'});
      done();
    });

  });

});