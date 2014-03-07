define(function (require) {
  var Courier = require('courier/courier');
  var DataSource = require('courier/data_source/data_source');
  var DocSource = require('courier/data_source/doc');
  var SearchSource = require('courier/data_source/search');

  return function extendCourierSuite() {
    describe('DataSource class', function () {
      var courier = new Courier();
      describe('::new', function () {
        it('optionally accepts a json object/string that will populate the DataSource object with settings', function () {
          var initialState = {
            _type: 'doc',
            index: 'logstash-[YYYY-MM-DD]',
            type: 'nginx',
            id: '1'
          };
          expect((new DocSource(courier, initialState)).toJSON()).to.eql(initialState);

          var savedState = JSON.stringify(initialState);
          expect(String(new DocSource(courier, savedState))).to.eql(savedState);
        });
      });

      describe('events', function () {
        describe('results', function () {
          it('emits when a new result is available');
          it('emits null when an error occurs');
        });
      });

      describe('chainable and synch API', function () {
        describe('#query', function () {
          it('sets the query of a DataSource');
        });

        describe('#filters', function () {
          it('converts the query to a filtered_query and sets the filters in that query');
        });

        describe('#sort', function () {
          it('adds a sort to the DataSource');
        });

        describe('#highlight', function () {
          it('sets the highlight fields for a DataSource');
        });

        describe('#aggs', function () {
          it('sets the aggs for the DataSource');
        });

        describe('#from', function () {
          it('sets the from property of the DataSource');
        });

        describe('#size', function () {
          it('sets the size property of the DataSource');
        });

        describe('#inherits', function () {
          it('sets the parent of a DataSource, meaning it will absorb it\'s filters/aggregations/etc.');
        });

        describe('#toJSON', function () {
          it('serializes the own properties of this DataSource to a JSON string');
        });
      });

      describe('async API', function () {
        describe('#fetch', function () {
          it('initiates a fetch at the Courier');
        });

        describe('#fields', function () {
          it('fetches the fields available for the given query, including the types possible for each field');
          it('returns types as an array, possibly containing multiple types or multi-index queries');
        });
      });
    });
  };
});