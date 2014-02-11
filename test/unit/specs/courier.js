define(function (require) {
  var Courier = require('courier/courier');
  var _ = require('lodash');

  describe('Courier Module', function () {

    it('provides a constructor for the Courier classs', function () {
      var courier = new Courier();
      expect(courier).to.be.a(Courier);
    });

    it('knows when a DataSource object has event listeners for the results event');
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
      beforeEach(function () {
        courier = new Courier();
      });

      afterEach(function () {
        courier.close();
      });

      describe('#fetchInterval', function () {
        it('sets the interval in milliseconds that queries will be fetched', function () {
          courier.fetchInterval(1000);
          expect(courier.fetchInterval()).to.eql(1000);
        });
      });

      describe('#define', function () {
        it('creates an empty (match all) DataSource object', function () {
          var source = courier.define();
          expect(source._state()).to.eql({});
        });
        it('optionally accepts a json object/string that will populate the DataSource object with settings', function () {
          var savedState = JSON.stringify({
            index: 'logstash-[YYYY-MM-DD]'
          });
          var source = courier.define(savedState);
          expect(source + '').to.eql(savedState);
        });
      });

      describe('#start', function () {
        it('triggers a fetch and begins the fetch cycle');
      });

      describe('#stop', function () {
        it('cancels current and future fetches');
      });
    });

    describe('source req tracking', function () {
      it('updates the stored query when the data source is updated', function () {
        var courier = new Courier();
        var source = courier.define();

        source.on('results', _.noop);
        source.index('the index name');

        expect(courier._getQueryForSource(source)).to.match(/the index name/);
      });
    });

    describe('source merging', function () {
      describe('basically', function () {
        it('merges the state of one data source with it\'s parents', function () {
          var courier = new Courier();

          var root = courier.define()
            .index('people')
            .type('students')
            .filter({
              term: {
                school: 'high school'
              }
            });

          var math = courier.define()
            .inherits(root)
            .filter({
              terms: {
                classes: ['algebra', 'calculus', 'geometry'],
                execution: 'or'
              }
            })
            .on('results', _.noop);

          expect(courier._writeQueryForSource(math))
            .to.eql(JSON.stringify({
              index: 'people',
              type: 'students'
            }) + '\n' +
            JSON.stringify({
              query: {
                filtered: {
                  query: { match_all: {} },
                  filter: { bool: {
                    must: [
                      { terms: { classes: ['algebra', 'calculus', 'geometry'], execution: 'or' } },
                      { term: { school: 'high school' } }
                    ]
                  } }
                }
              }
            })
          );
        });
      });
    });
  });
});