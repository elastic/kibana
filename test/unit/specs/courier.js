define(function (require) {
  var Courier = require('courier/courier');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  var DataSource = require('courier/data_source/data_source');
  var DocSource = require('courier/data_source/doc');
  var SearchSource = require('courier/data_source/search');

  describe('Courier Module', function () {

    it('provides a constructor for the Courier classs', function () {
      var courier = new Courier();
      expect(courier).to.be.a(Courier);
    });

    it('knows when a DataSource object has event listeners for the results event', function () {
      var courier = new Courier();
      var ds = courier.createSource('doc');

      expect(courier._openSources('doc')).to.have.length(0);
      ds.on('results', function () {});
      expect(courier._openSources('doc')).to.have.length(1);
      ds.removeAllListeners('results');
      expect(courier._openSources('doc')).to.have.length(0);
    });


    it('executes queries on the interval for searches that have listeners for results');

    describe('events', function () {
      describe('error', function () {
        it('emits when any request comes back with an error');
        it('emits multiple times when multiple requests error');
        it('hander is called with the client error object, and the DataSource object to which the error relates');
      });
    });

    describe('sync API', function () {
      var courier;

      afterEach(function () {
        if (courier) {
          courier.close();
        }
      });

      describe('#fetchInterval', function () {
        it('sets the interval in milliseconds that queries will be fetched');
        it('resets the timer if the courier has been started');
      });

      describe('#createSource', function () {
        it('creates an empty search DataSource object', function () {
          courier = new Courier();
          var source = courier.createSource();
          expect(source._state).to.eql({});
        });
        it('optionally accepts a type for the DataSource', function () {
          var courier = new Courier();
          expect(courier.createSource()).to.be.a(SearchSource);
          expect(courier.createSource('search')).to.be.a(SearchSource);
          expect(courier.createSource('doc')).to.be.a(DocSource);
          expect(function () {
            courier.createSource('invalid type');
          }).to.throwError(TypeError);
        });
        it('optionally accepts a json object/string that will populate the DataSource object with settings', function () {
          courier = new Courier();
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
        it('triggers a fetch and begins the fetch cycle', function () {
          courier = new Courier();

        });
      });

      describe('#stop', function () {
        it('cancels current and future fetches');
      });
    });

    describe('source req tracking', function () {
      it('updates the stored query when the data source is updated', function () {
        var courier = new Courier();
        var source = courier.createSource('search');

        source.on('results', _.noop);
        source.index('the index name');

        expect(source._flatten().index).to.eql('the index name');
      });
    });

    describe('source merging', function () {
      describe('basically', function () {
        it('merges the state of one data source with it\'s parents', function () {
          var courier = new Courier();

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
  });
});