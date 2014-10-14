define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var faker = require('faker');
  var Promise = require('bluebird');
  var _ = require('lodash');

  var SegmentedFetch;
  var segmentedFetch;
  var searchStrategy;
  var searchSource;
  var mockSearchSource;
  var searchSourceStubs;
  var es;
  var notify;

  function init() {
    module('kibana', function ($provide) {
      // mock notifier
      $provide.factory('Notifier', function () {
        function NotifierMock(opts) {
          this.opts = opts;
        }


        var stopEventSpy = sinon.spy();
        NotifierMock.prototype.event = sinon.stub().returns(stopEventSpy);

        return NotifierMock;
      });

      // mock es client
      $provide.factory('es', function () {
        return {};
      });
    });

    inject(function ($injector, Private) {
      es = $injector.get('es');
      var Notifier = $injector.get('Notifier');
      notify = new Notifier();

      SegmentedFetch = Private(require('plugins/discover/_segmented_fetch'));

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

    describe('_executeSearch', function () {
      it('should attach abort method to searchPromise', function () {
        es.search = function () { return Promise.resolve(); };
        segmentedFetch._executeSearch('test-index', {body: '', type: ''});

        expect(segmentedFetch.searchPromise).to.have.property('abort');
      });

      it('should abort client promise', function () {
        var clientAbortSpy = sinon.spy();
        es.search = function () {
          function MockClass() {
          }

          // mock the search client promise
          MockClass.prototype.then = function () {
            return this;
          };
          MockClass.prototype.catch = function () {
            return this;
          };
          MockClass.prototype.abort = clientAbortSpy;

          return new MockClass();
        };

        segmentedFetch._executeSearch(1, {body: '', type: ''});
        segmentedFetch.abort();


        return segmentedFetch.searchPromise.then(function (resolve) {
          expect(clientAbortSpy.callCount).to.be(1);
          expect(resolve).to.be(false);
        });
      });

      it('should resolve on ClusterBlockException', function () {
        es.search = Promise.method(function () {
          throw {
            status: 403,
            message: 'ClusterBlockException mock error test, index closed'
          };
        });

        segmentedFetch._executeSearch('test-index', {body: '', type: ''});

        return segmentedFetch.searchPromise.then(function (resolve) {
          expect(resolve).to.be(false);
        });
      });

      it('should reject on es client errors', function () {
        es.search = Promise.method(function () {
          throw new Error('es client error of some kind');
        });

        segmentedFetch._executeSearch('test-index', {body: '', type: ''});

        return segmentedFetch.searchPromise.catch(function (err) {
          expect(err.message).to.be('es client error of some kind');
        });
      });
    });

    describe('_processQueue', function () {
      var queueSpy;
      var completeSpy;
      var queue = [];

      // mock es client response trackers
      var totalTime;
      var totalHits;
      var maxHits;
      var maxScore;
      var aggregationKeys;

      var getESResponse = function (index, state) {
        var took = _.random(20, 60);
        var score = _.random(20, 90) / 100;
        var hits = faker.Lorem.sentence().split(' ');
        var aggKey = 'key' + _.random(1, 100);
        totalTime += took;
        totalHits += hits.length;
        maxHits = Math.max(maxHits, hits.length);
        maxScore = Math.max(maxScore, score);
        aggregationKeys = _.union(aggregationKeys, [aggKey]);

        return Promise.resolve({
          took: took,
          hits: {
            hits: hits,
            total: maxHits,
            max_score: score
          },
          aggregations: {
            'agg_test': {
              buckets: [{
                doc_count: hits.length,
                key: aggKey
              }]
            }
          }
        });
      };

      beforeEach(function () {
        totalTime = 0;
        totalHits = 0;
        maxHits = 0;
        maxScore = 0;
        aggregationKeys = [];

        queueSpy = sinon.spy(SegmentedFetch.prototype, '_processQueue');
        completeSpy = sinon.spy(SegmentedFetch.prototype, '_processQueueComplete');

        for (var i = 0; i < _.random(3, 6); i++) {
          queue.push('test-' + i);
        }

        sinon.stub(SegmentedFetch.prototype, '_extractQueue', function () {
          this.queue = queue.slice(0);
        });

        searchStrategy.getSourceStateFromRequest.returns(Promise.resolve({
          body: {
            size: 10
          }
        }));
      });

      it('should merge stats and complete', function () {

        sinon.stub(SegmentedFetch.prototype, '_executeSearch', getESResponse);

        function eachHandler(resp, req) {
          // check results from mergeRequestStats
          expect(segmentedFetch.requestStats).to.have.property('aggregations');
          expect(segmentedFetch.requestStats.aggregations['agg_test'].buckets.length).to.be(aggregationKeys.length);
          expect(segmentedFetch.requestStats.took).to.be(totalTime);
          expect(segmentedFetch.requestStats.hits.hits.length).to.be(totalHits);
          expect(segmentedFetch.requestStats.hits.total).to.be(maxHits);
          expect(segmentedFetch.requestStats.hits.max_score).to.be(maxScore);

          // check aggregation stats
          aggregationKeys.forEach(function (key) {
            expect(segmentedFetch.requestStats._bucketIndex).to.have.property(key);
          });
        }

        return segmentedFetch.fetch({ each: eachHandler }).then(function () {
          expect(completeSpy.callCount).to.be(1);
          expect(queueSpy.callCount).to.be(queue.length);
        });
      });

      it('should complete on falsey response', function () {
        sinon.stub(SegmentedFetch.prototype, '_executeSearch', function (index, state) {
          return Promise.resolve(false);
        });

        return segmentedFetch.fetch().then(function () {
          expect(completeSpy.callCount).to.be(1);
          expect(queueSpy.callCount).to.be(queue.length);
        });
      });
    });

    describe('fetch', function () {
      it('should return a promise', function () {
        sinon.stub(SegmentedFetch.prototype, '_executeRequest', Promise.resolve);

        var fetch = segmentedFetch.fetch();
        expect('then' in fetch).to.be(true);
        return fetch;
      });

      it('should stop the request', function () {
        var stopSpy = sinon.spy(SegmentedFetch.prototype, '_stopRequest');
        sinon.stub(SegmentedFetch.prototype, '_executeRequest', Promise.resolve);

        return segmentedFetch.fetch().then(function () {
          // always called on fetch, called again at resolution
          expect(stopSpy.callCount).to.be(2);
        });
      });

      it('should stop multiple requests', function () {
        var stopSpy = sinon.spy(SegmentedFetch.prototype, '_stopRequest');
        sinon.stub(SegmentedFetch.prototype, '_executeRequest').returns(Promise.delay(5));

        segmentedFetch.fetch();

        return Promise.delay(1).then(function () {
          return segmentedFetch.fetch().then(function () {
            // 1 for fetch
            // 1 for second fetch
            // 1 for stopping the first request early
            // 1 for resolving the second request
            expect(stopSpy.callCount).to.be(4);
          });
        });
      });

      it('should wait before starting new requests', function () {
        var startSpy = sinon.spy(SegmentedFetch.prototype, '_startRequest');
        var stopSpy = sinon.spy(SegmentedFetch.prototype, '_stopRequest');
        var fetchCount = _.random(3, 6);
        var resolveCount = 0;
        var resolvedPromises = [];

        sinon.stub(SegmentedFetch.prototype, '_executeRequest', function () {
          // keep resolving faster as we move along
          return Promise.delay(fetchCount - resolveCount);
        });

        _.times(fetchCount, function (idx) {
          resolvedPromises.push(segmentedFetch.fetch().then(function () {
            var resolveOrder = idx + 1;
            ++resolveCount;

            expect(resolveCount).to.be(resolveOrder);
            expect(startSpy.callCount).to.be(resolveOrder);
            // called once for every fetch, and again for each resolution
            expect(stopSpy.callCount).to.be(fetchCount + resolveOrder);
          }));
        });

        return Promise.all(resolvedPromises);
      });

      it('should perform actions on searchSource', function () {
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

      it('should abort the searchPromise', function () {
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
          // 1 for fetch, 1 for actual abort call
          expect(searchPromiseAbortStub.callCount).to.be(2);
        });
      });


      it('should clear the notification', function () {
        segmentedFetch.notifyEvent = sinon.spy();

        sinon.stub(SegmentedFetch.prototype, 'fetch', function (opts) {
          var SegmentedFetchSelf = this;
          var fakeRequest = {};

          return Promise.try(function () {
            return SegmentedFetchSelf._startRequest();
          })
          .then(function () {
            SegmentedFetchSelf._setRequest(fakeRequest);
          })
          .then(function () {
            // dumb mock or the fetch lifecycle
            // loop, running each
            while (SegmentedFetchSelf.activeRequest !== null) {
              if (typeof opts.each === 'function') {
                opts.each();
              }
            }

            // return when activeRequest is null
            return;
          })
          .then(function () {
            SegmentedFetchSelf._stopRequest();
          });
        });

        var eachHandler = sinon.spy(function () {
          // will set activeRequest to null
          segmentedFetch.abort();
        });

        return segmentedFetch.fetch({ each: eachHandler }).then(function () {
          expect(eachHandler.callCount).to.be(1);
          // 1 for stop from fetch, 1 from abort
          expect(segmentedFetch.notifyEvent.callCount).to.be(2);
        });
      });
    });
  });
});