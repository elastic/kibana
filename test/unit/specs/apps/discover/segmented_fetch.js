define(function (require) {
  var sinon = require('sinon/sinon');
  var Promise = require('bluebird');

  var SegmentedFetch;
  var segmentedFetch;
  var searchStrategy;
  var searchSource;
  var mockSearchSource;
  var searchSourceStubs = {
    get: sinon.stub(),
    toIndexList: sinon.stub().returns([]),
    createRequest: sinon.stub().returns({source: {activeFetchCount: 0}})
  };
  var notify;

  function init() {
    module('kibana', function ($provide) {
      $provide.factory('Notifier', function () {
        function NotifierMock(opts) {
          this.opts = opts;
        }

        var stopEventSpy = NotifierMock.prototype.stopEventSpy = sinon.spy();
        NotifierMock.prototype.event = sinon.stub().returns(stopEventSpy);

        return NotifierMock;
      });

      // var getStateFromRequest = Private(require('components/courier/fetch/strategy/search')).getSourceStateFromRequest;
    });

    inject(function ($injector, Private) {
      var Notifier = $injector.get('Notifier');
      notify = new Notifier();

      SegmentedFetch = Private(require('apps/discover/_segmented_fetch'));

      mockSearchSource = {
        get: searchSourceStubs.get.returns({
          toIndexList: searchSourceStubs.toIndexList.returns([])
        }),
        _createRequest: searchSourceStubs.createRequest
      };
      segmentedFetch = new SegmentedFetch(mockSearchSource);

      searchStrategy = Private(require('components/courier/fetch/strategy/search'));
      searchStrategy.getSourceStateFromRequest = sinon.stub();
    });
  }

  describe.only('segmented fetch', function () {
    beforeEach(init);

    describe('fetch', function () {
      var fetch;

      it('should return a promise');
      it('should stop existing requests');

      it('should perform actions on searchSource', function () {
        SegmentedFetch.prototype._startRequest = Promise.resolve;
        SegmentedFetch.prototype._processQueue = Promise.resolve;

        return segmentedFetch.fetch().then(function () {
          // read the searchSource queue
          expect(searchSourceStubs.get.callCount).to.be(1);
          expect(searchSourceStubs.toIndexList.callCount).to.be(1);
          // create the searchSource request
          expect(searchSourceStubs.createRequest.callCount).to.be(1);
        });
      });

      it('should create a notification event');
    });

    describe('abort', function () {
      it('should return a promise');
      it('should abort the existing fetch');
      it('should abort the es promise');
      it('should clear the notification');
    });
  });
});