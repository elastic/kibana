define(function (require) {
  'use strict';
  var getTimelineData = require('panels/marvel/shard_allocation/requests/getTimelineData');
  var _ = require('lodash');

  describe('shard_allocation', function () {
    describe('requests/getTimelineData.js', function () {
      var initialData = [ { fields:{ '@timestamp': ['2014-01-01T23:00:00.000Z'] } } ]; 

      var timeRange = {
        from: '2014-01-01T00:00:00.000Z',
        to: '2014-01-02T00:00:00.000Z'
      };

      var config = { elasticsearch: 'http://localhost:9200' };

      var successFixture = {
        data: {
          hits: {
            hits: [
              {
                fields:{ '@timestamp': ['2014-01-01T12:00:00.000Z'] }
              }
            ],
            total: 2
          }
        }
      };

      var dashboard = {
        indices: ['index-1', 'index-2'] 
      };
      
      var url = 'http://localhost:9200/index-1,index-2/cluster_state/_search';

      var body = {
        size: 2,
        from: 0,
        fields: ['@timestamp', 'message', 'status'],
        sort: {
          '@timestamp': { order: 'desc' }
        },
        query: {
          filtered: {
            filter: {
              range: {
                '@timestamp': timeRange
              }
            }
          }
        }
      };

      var q, http, rootScope, getTimeline, filterSrv, firstPromise;

      beforeEach(inject(function ($q, $rootScope) {
        rootScope = $rootScope;
        q = $q;
        firstPromise = q.defer();
        http = { post: sinon.stub() };
        http.post.onFirstCall().returns(firstPromise.promise);
        filterSrv = { timeRange: sinon.stub() };
        filterSrv.timeRange.returns(timeRange);
        getTimeline = getTimelineData(http, dashboard, filterSrv);
        getTimeline = _.partial(getTimeline, config);
      }));

      it('should call twice if the response is the same as size arg and the total is greater', function (done) {
        var secondPromise = q.defer();
        http.post.onSecondCall().returns(secondPromise.promise);
        var firstResponse = {
          data: {
            hits: {
              hits: [
                {
                  fields:{ '@timestamp': ['2014-01-01T12:00:00.000Z'] }
                },
                {
                  fields:{ '@timestamp': ['2014-01-01T12:01:00.000Z'] }
                }
              ],
              total: 3
            }
          }
        };
        var secondResponse = {
          data: {
            hits: {
              hits: [
                {
                  fields:{ '@timestamp': ['2014-01-01T12:02:00.000Z'] }
                }
              ],
              total: 3
            }
          }
        };
        getTimeline(2, timeRange, _.clone(initialData)).then(function () {
          sinon.assert.calledTwice(http.post);
          done();
        });
        firstPromise.resolve(firstResponse);
        secondPromise.resolve(secondResponse);
        rootScope.$apply();
      });

      it('should http.post() with url and body', function (done) {
        getTimeline(2, timeRange, _.clone(initialData)).then(function () {
          sinon.assert.calledWith(http.post, url, body);
          done(); 
        }); 
        firstPromise.resolve(successFixture);
        rootScope.$apply();
      });

      it('should append results to data array', function (done) {
        getTimeline(2, timeRange, _.clone(initialData)).then(function (data) {
          expect(data).to.deep.equal([
            { fields:{ '@timestamp': ['2014-01-01T12:00:00.000Z'] } },
            { fields:{ '@timestamp': ['2014-01-01T23:00:00.000Z'] } }
          ]);
          done(); 
        }); 
        firstPromise.resolve(successFixture);
        rootScope.$apply();
      });

    });
  });
});
