define(function (require) {
  var sinon = require('sinon/sinon');
  require('components/state_management/global_state');

  describe('State Management', function () {
    var $rootScope, $location, state;

    beforeEach(function () {
      module('kibana');

      inject(function (_$location_, globalState) {
        $location = _$location_;
        state = globalState;
      });
    });

    describe('Global State', function () {
      it('should use previous state when not in URL', function () {
        // set satte via URL
        $location.search({ _g: '(foo:(bar:baz))' });
        state.fetch();
        expect(state.toObject()).to.eql({ foo: { bar: 'baz' } });

        $location.search({ _g: '(fizz:buzz)' });
        state.fetch();
        expect(state.toObject()).to.eql({ fizz: 'buzz' });

        $location.search({});
        state.fetch();
        expect(state.toObject()).to.eql({ fizz: 'buzz' });
      });
    });
  });
});
