define(function (require) {
  var Courier = require('courier/courier');
  var HastyRefresh = require('courier/errors').HastyRefresh;
  var _ = require('lodash');
  var DataSource = require('courier/data_source/data_source');
  var DocSource = require('courier/data_source/doc');
  var SearchSource = require('courier/data_source/search');
  var nextTick = require('utils/next_tick');
  var createCourier = require('testUtils/create_courier');
  var sinon = require('testUtils/auto_release_sinon');
  var Client = require('bower_components/elasticsearch/elasticsearch').Client;

  var nativeSetTimeout = setTimeout;
  var nativeClearTimeout = clearTimeout;

  describe('Courier Module', function () {

    // create a generic response for N requests
    function responses(n) {
      var resp = [];
      _.times(n, function () {
        resp.push({
          hits: {
            hits: []
          }
        });
      });
      return { responses: resp };
    }

    // create a generic response with errors for N requests
    function errorsReponses(n) {
      var resp = [];
      _.times(n, function () {
        resp.push({ error: 'search error' });
      });
      return { responses: resp };
    }

    function stubbedClient(respond) {
      respond = respond || function (method, params, cb) {
        var n = (params.body) ? Math.floor(params.body.split('\n').length / 2) : 0;
        cb(null, responses(n));
      };

      var stub = {
        callCount: 0,
        abortCalled: 0
      };

      _.each(['msearch', 'mget'], function (method) {
        stub[method] = function (params, cb) {
          stub[method].callCount++;
          stub.callCount ++;

          var id = nativeSetTimeout(_.partial(respond, method, params, cb), 3);
          return {
            abort: function () {
              nativeClearTimeout(id);
              stub.abortCalled ++;
            }
          };
        };
        stub[method].callCount = 0;
      });

      return stub;
    }

    it('provides a constructor for the Courier classs', function () {
      expect(createCourier()).to.be.a(Courier);
    });

    it('knows when a DataSource object has event listeners for the results event', function () {
      var courier = createCourier();
      var ds = courier.createSource('doc');

      expect(courier._openSources()).to.have.length(0);
      ds.on('results', function () {});
      expect(courier._openSources('doc')).to.have.length(1);
      ds.removeAllListeners('results');
      expect(courier._openSources()).to.have.length(0);
    });

    it('protects ES against long running queries by emitting HastyRefresh error', function (done) {
      var count = 0;
      var courier = createCourier({
        client: stubbedClient()
      });

      courier
        .createSource('search')
        .on('results', function () {
          done(++count > 1 ? new Error('should have only gotten one result') : null);
        });

      courier.fetch();
      courier.fetch();

      courier.on('error', function (err) {
        expect(err).to.be.a(HastyRefresh);
      });
    });

    describe('events', function () {
      describe('error', function () {
        it('emits when the client fails', function (done) {
          var err = new Error('Error!');
          var courier = createCourier({
            client: stubbedClient(function (method, params, cb) { cb(err); })
          });

          courier.on('error', function (emittedError) {
            expect(emittedError).to.be(err);
            done();
          });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            });

          courier.fetch();
        });

        it('emits once for each request that fails', function (done) {
          var count = 0;
          var courier = createCourier({
            client: stubbedClient(function (method, params, cb) {
              cb(null, errorsReponses(2));
            })
          });

          courier.on('error', function (emittedError) {
            if (++ count === 2) done();
          });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            });

          courier.fetch();
        });

        it('sends error responses to the data source if it is listening, not the courier', function (done) {
          var courier = createCourier({
            client: stubbedClient(function (method, params, cb) {
              cb(null, errorsReponses(1));
            })
          });

          courier.on('error', function (err) {
            done(new Error('the courier should not have emitted an error'));
          });

          courier
            .createSource('search')
            .on('results', function () {
              done(new Error('did not expect results to come back'));
            })
            .on('error', function () {
              done();
            });

          courier.fetch();
        });
      });
    });

    describe('sync API', function () {
      describe('#(fetch|doc)Interval', function () {
        it('gets/sets the internal interval (ms) that fetchs will happen once the courier is started', function () {
          var courier = createCourier();
          courier.fetchInterval(15000);
          expect(courier.fetchInterval()).to.equal(15000);

          courier.docInterval(15001);
          expect(courier.docInterval()).to.equal(15001);
        });

        it('does not trigger a fetch when the courier is not running', function () {
          var clock = sinon.useFakeTimers();
          var courier = createCourier();
          courier.fetchInterval(1000);
          expect(clock.timeoutCount()).to.be(0);
        });

        it('resets the timer if the courier is running', function () {
          var clock = sinon.useFakeTimers();
          var courier = createCourier({
            client: stubbedClient()
          });

          // setting the
          courier.fetchInterval(10);
          courier.docInterval(10);
          courier.start();

          expect(clock.timeoutCount()).to.be(2);
          expect(_.where(clock.timeoutList(), { callAt: 10 })).to.have.length(2);

          courier.fetchInterval(1000);
          courier.docInterval(1000);
          // courier should still be running

          expect(clock.timeoutCount()).to.be(2);
          expect(_.where(clock.timeoutList(), { callAt: 1000 })).to.have.length(2);
        });
      });

      describe('#createSource', function () {
        it('creates an empty search DataSource object', function () {
          var courier = createCourier();
          var source = courier.createSource();
          expect(source._state).to.eql({});
        });

        it('optionally accepts a type for the DataSource', function () {
          var courier = createCourier();
          expect(courier.createSource()).to.be.a(SearchSource);
          expect(courier.createSource('search')).to.be.a(SearchSource);
          expect(courier.createSource('doc')).to.be.a(DocSource);
          expect(function () {
            courier.createSource('invalid type');
          }).to.throwError(TypeError);
        });

        it('optionally accepts a json object/string that will populate the DataSource object with settings', function () {
          var courier = createCourier();
          var savedState = JSON.stringify({
            _type: 'doc',
            index: 'logstash-[YYYY-MM-DD]',
            type: 'nginx',
            id: '1'
          });
          var source = courier.createSource('doc', savedState);
          expect(source + '').to.eql(savedState);
        });
      });

      describe('#start', function () {
        it('triggers a fetch and begins the fetch cycle', function (done) {
          var clock = sinon.useFakeTimers();
          var client = stubbedClient();
          var courier = createCourier({
            client: client
          });

          // TODO: check that tests that listen for resutls and call courier.fetch are running async

          courier
            .createSource('search')
            .on('results', function () { done(); });

          courier.start();
          expect(client.callCount).to.equal(1); // just msearch, no mget
          expect(clock.timeoutCount()).to.equal(2); // one for search and one for doc
        });

        it('restarts the courier if it is already running', function () {
          var clock = sinon.useFakeTimers();
          var courier = createCourier({
            client: stubbedClient()
          });

          courier.on('error', function (err) {
            // since we are calling start before the first query returns
            expect(err).to.be.a(HastyRefresh);
          });

          // set the intervals to known values
          courier.fetchInterval(10);
          courier.docInterval(10);

          courier.start();
          // one for doc, one for search
          expect(clock.timeoutCount()).to.eql(2);
          // timeouts should be scheduled for 10 ticks out
          expect(_.where(clock.timeoutList(), { callAt: 10 }).length).to.eql(2);

          clock.tick(1);

          courier.start();
          // still two
          expect(clock.timeoutCount()).to.eql(2);
          // but new timeouts, due to tick(1);
          expect(_.where(clock.timeoutList(), { callAt: 11 }).length).to.eql(2);
        });
      });

      describe('#stop', function () {
        it('cancels current and future fetches', function () {
          var clock = sinon.useFakeTimers();
          var courier = createCourier({
            client: stubbedClient()
          });

          courier.start();
          expect(clock.timeoutCount()).to.eql(2);
          courier.stop();
          expect(clock.timeoutCount()).to.eql(0);
        });
      });
    });

    describe('source req tracking', function () {
      it('updates the stored query when the data source is updated', function () {
        var courier = createCourier();
        var source = courier.createSource('search');

        source.on('results', _.noop);
        source.index('the index name');

        expect(source._flatten().index).to.eql('the index name');
      });
    });

    describe('source merging', function () {
      describe('basically', function () {
        it('merges the state of one data source with it\'s parents', function () {
          var courier = createCourier();

          var root = courier.createSource('search')
            .index('people')
            .type('students')
            .filter({
              term: {
                school: 'high school'
              }
            });

          var math = courier.createSource('search')
            .inherits(root)
            .filter({
              terms: {
                classes: ['algebra', 'calculus', 'geometry'],
                execution: 'or'
              }
            })
            .on('results', _.noop);

          var query = math._flatten();
          expect(query.index).to.eql('people');
          expect(query.type).to.eql('students');
          expect(query.body).to.eql({
            query: {
              filtered: {
                query: { 'match_all': {} },
                filter: { bool: {
                  must: [
                    { terms: { classes: ['algebra', 'calculus', 'geometry'], execution: 'or' } },
                    { term: { school: 'high school' } }
                  ]
                } }
              }
            }
          });
        });
      });
    });

    describe('fetch interval behavior', function () {
      it('defers to the "fetch" method on the SearchSource class to do the fetch', function () {
        sinon.stub(SearchSource, 'fetch');

        var courier = createCourier();

        courier.fetch('search');
        expect(SearchSource.fetch.callCount).to.equal(1);
      });

      it('defers to the "validate" method on the DocSource class to determine which docs need fetching', function () {
        sinon.stub(DocSource, 'validate');

        var courier = createCourier();

        courier.fetch('doc');
        expect(DocSource.validate.callCount).to.equal(1);
      });

      it('when it receives refs from DocSource.validate, passes them back to DocSource.fetch', function (done) {
        sinon.stub(DocSource, 'validate', function (courier, refs, cb) {
          // just pass back the refs we receive
          nextTick(cb, null, refs);
        });
        sinon.spy(DocSource, 'fetch');

        var courier = createCourier({
          client: stubbedClient(function (method, params, cb) {
            cb(null, {
              docs: [
                {
                  found: true,
                  _version: 1,
                  _source: {}
                }
              ]
            });
          })
        });

        courier
          .createSource('doc')
          .index('foo').type('bar').id('bax')
          .on('results', function () {
            done();
          });

        courier.fetch('doc');
        expect(DocSource.validate.callCount).to.equal(1);
      });

      it('calls it\'s own fetch method when the interval is up and immediately schedules another fetch', function () {
        var courier = createCourier();
        var clock = sinon.useFakeTimers();

        var count = 0;
        sinon.stub(courier, 'fetch', function () {
          count++;
        });

        courier.fetchInterval(10);
        courier.start();
        expect(count).to.eql(1);
        clock.tick(10);
        expect(count).to.eql(2);
      });
    });

    describe('#abort', function () {
      it('calls abort on the current request if it exists', function () {
        var client = stubbedClient();
        var courier = createCourier({ client: client });

        courier
          .createSource('search')
          .on('results', _.noop);

        courier.abort();
        expect(client.abortCalled).to.eql(0);

        courier.fetch('search');
        courier.abort();
        expect(client.abortCalled).to.eql(1);
      });
    });
  });
});