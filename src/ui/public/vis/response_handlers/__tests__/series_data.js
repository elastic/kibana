import expect from 'expect.js';
import { seriesResponseHandlerProvider } from '../series_data';

const responseHandler = seriesResponseHandlerProvider().handler;

describe('Series Response Handler', function () {

  describe('date_histogram terms and filter data', function () {
    const data = require('fixtures/agg_resp/date_term_filter');
    const expectedData = require('fixtures/response_handlers/series/filter_date_term');
    const vis = {
      aggs: [{
        'id': '1',
        'enabled': true,
        'type': { name: 'count' },
        'schema': { name: 'metric', group: 'metrics' },
        'params': {},
        fieldFormatter: () => x => x,
        makeLabel: () => 'Count'
      }, {
        'id': '2',
        'enabled': true,
        'type': { name: 'date_histogram' },
        'schema': { name: 'segment', group: 'buckets' },
        'params': {
          'field': '@timestamp',
          'interval': 'auto',
          'customInterval': '2h',
          'min_doc_count': 1,
          'extended_bounds': {}
        },
        fieldFormatter: () => x => x,
        write: () => { return {}; },
        makeLabel: () => '@timestamp per 2h'
      }, {
        'id': '3',
        'enabled': true,
        'type': { name: 'terms' },
        'schema': { name: 'group', group: 'buckets' },
        'params': {
          'field': 'response.raw',
          'size': 5,
          'order': 'desc',
          'orderBy': '1'
        },
        fieldFormatter: () => x => x,
        makeLabel: () => 'response.raw: descending'
      }, {
        'id': '4',
        'enabled': true,
        'type': { name: 'filters' },
        'schema': { name: 'split', group: 'buckets' },
        'params': {
          'filters': [
            { 'input': { 'query': '404' } },
            { 'input': { 'query': '200' } }
          ],
          'row': true
        },
        fieldFormatter: () => x => x,
        makeLabel: () => 'filters',
      }]
    };
    let convertedData;

    beforeEach(() => {
      return responseHandler(vis, data).then(response => {
        convertedData = response;
      });
    });

    it('converts data to point series', function () {
      expect(convertedData.charts.length).to.greaterThan(0);
      expect(convertedData.charts[0].series.length).to.greaterThan(0);
      expect(convertedData.charts[0].series[0].values.length).to.greaterThan(0);
    });

    it('data matches expected results', function () {
      expect(convertedData).to.equal(expectedData);
    });
  });

});
