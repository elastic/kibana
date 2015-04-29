var root = require('requirefrom')('');
var expect = require('expect.js');
var kibana = root('src/hapi');
var findPort = root('test/utils/find_port');
root('test/utils/ensure_elasticsearch');
var util = require('util');
var format = util.format;


describe('elasticsearch plugin', function () {
  var server, config;

  beforeEach(function () {
    return findPort(7000, 8000).then(function (port) {
      config = { 'kibana.server.port': port, 'logging.quiet': true };
      return kibana.start(config).then(function (_server) {
        server = _server;
      });
    });
  });

  afterEach(function (done) {
    server.stop(done);
  });

  function testRoute(options) {
    var statusCode = options.statusCode || 200;
    describe(format('%s %s', options.method, options.url), function () {
      it('should should return ' + statusCode, function (done) {
        server.inject(options, function (res) {
          expect(res.statusCode).to.be(statusCode);
          done();
        });
      });
    });
  }


  testRoute({
    method: 'GET',
    url: '/elasticsearch/_nodes'
  });

  testRoute({
    method: 'GET',
    url: '/elasticsearch/'
  });

  testRoute({
    method: 'GET',
    url: '/elasticsearch/.kibana'
  });

  testRoute({
    method: 'POST',
    url: '/elasticsearch/.kibana',
    payload: '{settings: {number_of_shards: 1, number_of_replicas: 1}}',
    statusCode: 201
  });

  testRoute({
    method: 'POST',
    url: '/elasticsearch/.kibana/_bulk',
    payload: '{}',
    statusCode: 400
  });

  testRoute({
    method: 'GET',
    url: '/elasticsearch/.kibana/_mapping/*/field/_source'
  });

  testRoute({
    method: 'POST',
    url: '/elasticsearch/.kibana/index-pattern/_search?fields=',
    payload: '{query: {match_all: {}}, size: 2147483647}'
  });

  testRoute({
    method: 'POST',
    url: '/elasticsearch/.kibana/__kibanaQueryValidator/_validate/query?explain=true&ignore_unavailable=true',
    payload: '{query: {query_string: {analyze_wildcard: true, query: "*"}}}'
  });

  testRoute({
    method: 'POST',
    url: '/elasticsearch/_mget?timeout=0&ignore_unavailable=true&preference=1429574531063',
    payload: '{docs: [{_index: ".kibana", _type: "index-pattern", _id: "[logstash-]YYYY.MM.DD"}]}'
  });

  /* jscs:disable maximumLineLength */
  testRoute({
    method: 'POST',
    url: '/elasticsearch/_msearch?timeout=0&ignore_unavailable=true&preference=1429577952339',
    payload: '{"index":"logstash-2015.04.21","ignore_unavailable":true}\n{"size":500,"sort":{"@timestamp":"desc"},"query":{"filtered":{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}},"filter":{"bool":{"must":[{"range":{"@timestamp":{"gte":1429577068175,"lte":1429577968175}}}],"must_not":[]}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"30s","pre_zone":"-07:00","pre_zone_adjust_large_interval":true,"min_doc_count":0,"extended_bounds":{"min":1429577068175,"max":1429577968175}}}},"fields":["*","_source"],"script_fields":{},"fielddata_fields":["timestamp_offset","@timestamp","utc_time"]}\n'
  });
  /* jscs:enable maximumLineLength */

});


