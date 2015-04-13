define(function (require) {
  describe('Filter Bar watchFilters()', function () {
    var sinon = require('test_utils/auto_release_sinon');
    var _ = require('lodash');

    var watchFilters;
    var Promise;
    var EventEmitter;
    var $scope;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      Promise = $injector.get('Promise');
      EventEmitter = Private(require('factories/events'));
      watchFilters = Private(require('components/filter_bar/lib/watchFilters'));
      $scope = {
        $watch: sinon.stub()
      };
    }));

    it('returns an event emitter', function () {
      expect(watchFilters($scope)).to.be.an(EventEmitter);
    });

    it('listens to the filters on state', function () {
      watchFilters($scope, { update: _.noop, fetch: _.noop });
      expect($scope.$watch).to.have.property('callCount', 1);

      var call = $scope.$watch.getCall(0);
      expect(call.args[0]).to.be('state.filters');
    });

    describe('change handling', function () {
      require('test_utils/no_digest_promises').activateForSuite();

      it('calls update and fetch', function () {
        var onFetch = sinon.stub();
        var onUpdate = sinon.stub();

        watchFilters($scope).on('fetch', onFetch).on('update', onUpdate);
        var handler = $scope.$watch.args[0][1];

        return handler([ {} ], [])
        .then(function () {
          expect(onUpdate).to.have.property('callCount', 1);
          expect(onFetch).to.have.property('callCount', 1);
        });
      });

      it('only calls update if all filters are disabled', function () {
        var onFetch = sinon.stub();
        var onUpdate = sinon.stub();

        watchFilters($scope).on('fetch', onFetch).on('update', onUpdate);
        var handler = $scope.$watch.args[0][1];

        return handler([ ], [ { meta: { disabled: true } } ])
        .then(function () {
          expect(onUpdate).to.have.property('callCount', 1);
          expect(onFetch).to.have.property('callCount', 0);
        });
      });

      it('calls nothing if there were no changes', function () {
        var onFetch = sinon.stub();
        var onUpdate = sinon.stub();

        watchFilters($scope).on('fetch', onFetch).on('update', onUpdate);
        var handler = $scope.$watch.args[0][1];
        var cur = [];
        var prev = cur;

        return Promise.try(handler, [cur, prev])
        .then(function () {
          expect(onUpdate).to.have.property('callCount', 0);
          expect(onFetch).to.have.property('callCount', 0);
        });
      });
    });

  });
});
