define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
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
    });

    inject(function ($injector, Private) {
      var Notifier = $injector.get('Notifier');
      notify = new Notifier();

      SegmentedFetch = Private(require('apps/discover/_segmented_fetch'));

      // mock the searchSource
      searchSourceStubs = {
        get: sinon.stub(),
        toIndexList: sinon.stub().returns([]),
        createRequest: sinon.stub().returns({
          defer: Promise,
          source: {
            activeFetchCount: 0
          }
        })
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
        SegmentedFetch.prototype._executeRequest = Promise.resolve;

        var fetch = segmentedFetch.fetch();
        expect('then' in fetch).to.be(true);
        return fetch;
      });

      it('should set the running state', function () {
        SegmentedFetch.prototype._executeRequest = Promise.resolve;

        return segmentedFetch.fetch().then(function () {
          expect(segmentedFetch.running).to.be(true);
        });
      });

      it('should not call stopRequest if request is not running', function () {
        SegmentedFetch.prototype._executeRequest = Promise.resolve;
        SegmentedFetch.prototype._stopRequest = sinon.stub().returns(Promise.resolve());

        expect(segmentedFetch.running).to.be(false);
        return segmentedFetch.fetch().then(function () {
          expect(segmentedFetch.running).to.be(true);
          expect(segmentedFetch._stopRequest.callCount).to.be(0);
        });
      });

      it('should stop existing requests', function () {
        SegmentedFetch.prototype._executeRequest = sinon.stub().returns(Promise.delay(5));
        SegmentedFetch.prototype._stopRequest = sinon.stub().returns(Promise.resolve());

        segmentedFetch.fetch();

        Promise.delay(1).then(function () {
          expect(segmentedFetch.running).to.be(true);
          segmentedFetch.fetch();
        });

        return Promise.delay(2).then(function () {
          expect(segmentedFetch.running).to.be(true);
          return segmentedFetch.fetch().then(function () {
            expect(segmentedFetch._stopRequest.callCount).to.be(2);
          });
        });
      });

      it('should perform actions on searchSource', function () {
        SegmentedFetch.prototype._startRequest = Promise.resolve;
        SegmentedFetch.prototype._executeRequest = Promise.resolve;

        return segmentedFetch.fetch().then(function () {
          // read the searchSource queue
          expect(searchSourceStubs.get.callCount).to.be(1);
          expect(searchSourceStubs.toIndexList.callCount).to.be(1);
          // create the searchSource request
          expect(searchSourceStubs.createRequest.callCount).to.be(1);
        });
      });

      it('should create a notification event', function () {
        SegmentedFetch.prototype._executeRequest = Promise.resolve;

        return segmentedFetch.fetch().then(function () {
          expect(notify.event.callCount).to.be(1);
        });
      });

      it('should report initial status', function () {
        var statusStub = sinon.stub();
        SegmentedFetch.prototype._processQueue = Promise.resolve;
        searchStrategy.getSourceStateFromRequest.returns(Promise.resolve());

        return segmentedFetch.fetch({
          status: statusStub
        }).then(function () {
          expect(statusStub.callCount).to.be(1);

          var status = statusStub.getCall(0).args[0];
          expect(status.active).to.be(null);
          expect(status.total).to.be(searchSourceStubs.toIndexList.length);
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


      });

      it('should abort the es promise');

      it('should clear the notification', function () {
        var spy = segmentedFetch.notifyEvent = sinon.spy();

        return segmentedFetch.abort().then(function () {
          expect(spy.callCount).to.be(1);
        });
      });
    });
  });
});