define(function (require) {
  var sinon = require('sinon/sinon');
  var Promise = require('bluebird');

  var SegmentedFetch;
  var segmentedFetch;
  var searchStrategy;
  var searchSource;
  var mockSearchSource;
  var searchSourceStubs;
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

      // mock the searchSource
      searchSourceStubs = {
        get: sinon.stub(),
        toIndexList: sinon.stub().returns([]),
        createRequest: sinon.stub().returns({source: {activeFetchCount: 0}})
      };
      mockSearchSource = {
        get: searchSourceStubs.get.returns({
          toIndexList: searchSourceStubs.toIndexList.returns([])
        }),
        _createRequest: searchSourceStubs.createRequest
      };

      // create segmentedFetch instance with mocked searchSource
      segmentedFetch = new SegmentedFetch(mockSearchSource);

      // stub the searchStrategy
      searchStrategy = Private(require('components/courier/fetch/strategy/search'));
      searchStrategy.getSourceStateFromRequest = sinon.stub();
    });
  }

  describe.only('segmented fetch', function () {
    require('test_utils/no_digest_promises').activateForSuite();

    beforeEach(init);

    describe('fetch', function () {
      it('should return a promise', function () {
        SegmentedFetch.prototype._startRequest = Promise.resolve;
        SegmentedFetch.prototype._processQueue = Promise.resolve;

        var fetch = segmentedFetch.fetch();
        expect('then' in fetch).to.be(true);
        return fetch;
      });

      it('should set the running state', function () {
        SegmentedFetch.prototype._processQueue = Promise.resolve;

        return segmentedFetch.fetch().then(function () {
          expect(segmentedFetch.running).to.be(true);
        });
      });

      it('should stop existing requests', function (done) {
        segmentedFetch.running = true;
        SegmentedFetch.prototype._processQueue = Promise.resolve;
        SegmentedFetch.prototype._stopProcess = sinon.stub().returns(Promise.resolve());

        return segmentedFetch.fetch().then(function () {
          setTimeout(function () {
            expect(segmentedFetch.running).to.be(true);
            segmentedFetch.fetch().then(function () {
              expect(segmentedFetch._stopProcess.callCount).to.be(1);
            });
            done();
          }, 0);
        });
      });

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

      it('should create a notification event', function () {
        SegmentedFetch.prototype._processQueue = Promise.resolve;

        return segmentedFetch.fetch().then(function () {
          expect(notify.event.callCount).to.be(1);
        });
      });
    });

    describe('abort', function () {
      it('should return a promise', function () {
        var abort = segmentedFetch.abort();
        expect('then' in abort).to.be(true);
        return abort;
      });

      it('should abort the existing fetch');

      it('should abort the es promise', function () {

      });

      it('should clear the notification', function () {
        var spy = segmentedFetch.notifyEvent = sinon.spy();

        return segmentedFetch.abort().then(function () {
          expect(spy.callCount).to.be(1);
        });
      });
    });
  });
});