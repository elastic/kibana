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


        var stopEventSpy = sinon.spy();
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
        createRequest: sinon.spy(function () {
          return {
            defer: Promise.defer(),
            source: {
              activeFetchCount: 0
            }
          };
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
      sinon.stub(searchStrategy, 'getSourceStateFromRequest');
    });
  }

  describe('segmented fetch', function () {
    require('test_utils/no_digest_promises').activateForSuite();

    beforeEach(init);

    describe('fetch', function () {
      it('should return a promise', function () {
        sinon.stub(SegmentedFetch.prototype, '_startRequest', Promise.resolve);
        sinon.stub(SegmentedFetch.prototype, '_executeRequest', Promise.resolve);

        var fetch = segmentedFetch.fetch();
        expect('then' in fetch).to.be(true);
        return fetch;
      });

      it('should set the running state', function () {
        var stopStub = sinon.stub(SegmentedFetch.prototype, '_stopRequest', Promise.resolve);
        sinon.stub(SegmentedFetch.prototype, '_executeRequest', Promise.resolve);

        return segmentedFetch.fetch().then(function () {
          expect(segmentedFetch.running).to.be(true);
          expect(stopStub.callCount).to.be(1);
        });
      });

      it('should stop existing requests', function () {
        var stopStub = sinon.stub(SegmentedFetch.prototype, '_stopRequest', Promise.resolve);
        sinon.stub(SegmentedFetch.prototype, '_executeRequest').returns(Promise.delay(5));

        segmentedFetch.fetch();

        return Promise.delay(1).then(function () {
          expect(segmentedFetch.running).to.be(true);
          return segmentedFetch.fetch().then(function () {
            // 1 for stopping the first request early
            // 1 for finishing the second request
            expect(stopStub.callCount).to.be(2);
          });
        });
      });

      it('should perform actions on searchSource', function () {
        sinon.stub(SegmentedFetch.prototype, '_startRequest', Promise.resolve);
        sinon.stub(SegmentedFetch.prototype, '_executeRequest', Promise.resolve);

        return segmentedFetch.fetch().then(function () {
          // read the searchSource queue
          expect(searchSourceStubs.get.callCount).to.be(1);
          expect(searchSourceStubs.toIndexList.callCount).to.be(1);
          // create the searchSource request
          expect(searchSourceStubs.createRequest.callCount).to.be(1);
        });
      });

      it('should create a notification event', function () {
        sinon.stub(SegmentedFetch.prototype, '_executeRequest', Promise.resolve);

        return segmentedFetch.fetch().then(function () {
          expect(notify.event.callCount).to.be(1);
        });
      });

      it('should report initial status', function () {
        var statusStub = sinon.stub();
        sinon.stub(SegmentedFetch.prototype, '_processQueue', function () {
          return new Promise(function (res) { return res(); });
        });
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

      it('should abort the existing fetch', function () {
        var loopCount = 3;
        var queue = [];
        for (var i = 0; i <= loopCount; i++) {
          queue.push('queue-index-' + i);
        }

        sinon.stub(SegmentedFetch.prototype, '_extractQueue', function () {
          this.queue = queue;
        });
        sinon.stub(SegmentedFetch.prototype, '_executeSearch', function () {
          return new Promise(function (resolve) {
            resolve({
              took: 10,
              hits: {
                total: 10,
                max_score: 1,
                hits: []
              }
            });
          });
        });

        searchStrategy.getSourceStateFromRequest.returns(Promise.resolve({
          body: {
            size: 10
          }
        }));

        var eachHandler = sinon.spy(function () {
          if (eachHandler.callCount === loopCount) {
            segmentedFetch.abort();
          }
        });

        return segmentedFetch.fetch({ each: eachHandler }).then(function () {
          expect(eachHandler.callCount).to.be(loopCount);
        });
      });

      it('should abort the es promise', function () {
        var searchPromiseAbortStub = sinon.spy();
        sinon.stub(SegmentedFetch.prototype, '_extractQueue', function () {
          this.queue = ['one', 'two', 'three'];
        });
        sinon.stub(SegmentedFetch.prototype, '_executeSearch', function () {
          this.searchPromise = { abort: searchPromiseAbortStub };
          return Promise.resolve();
        });
        sinon.stub(SegmentedFetch.prototype, '_executeRequest', function () {
          var self = this;
          return self._executeSearch()
          .then(function () {
            if (typeof self.requestHandlers.each === 'function') {
              return self.requestHandlers.each();
            }
          });
        });

        searchStrategy.getSourceStateFromRequest.returns(Promise.resolve({
          body: {
            size: 10
          }
        }));

        var eachHandler = sinon.spy(function () {
          segmentedFetch.abort();
        });

        return segmentedFetch.fetch({ each: eachHandler }).then(function () {
          expect(eachHandler.callCount).to.be(1);
          expect(searchPromiseAbortStub.callCount).to.be(1);
        });
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