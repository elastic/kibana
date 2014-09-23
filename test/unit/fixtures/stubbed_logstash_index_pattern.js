define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    var StubIndexPattern = Private(require('test_utils/stub_index_pattern'));
    return new StubIndexPattern('logstash-*', 'time', [
      { type: 'number',     indexed: true,  analyzed: true,  count: 10, name: 'bytes' },
      { type: 'boolean',    indexed: true,  analyzed: true,  count: 20, name: 'ssl' },
      { type: 'date',       indexed: true,  analyzed: true,  count: 30, name: '@timestamp' },
      { type: 'number',     indexed: true,  analyzed: true,  count: 0, name: 'phpmemory' },
      { type: 'ip',         indexed: true,  analyzed: true,  count: 0, name: 'ip' },
      { type: 'attachment', indexed: true,  analyzed: true,  count: 0, name: 'request_body' },
      { type: 'string',     indexed: true,  analyzed: true,  count: 0, name: 'extension' },
      { type: 'geo_point',  indexed: true,  analyzed: true,  count: 0, name: 'point' },
      { type: 'geo_shape',  indexed: true,  analyzed: true,  count: 0, name: 'area' },
      { type: 'string',     indexed: true,  analyzed: true,  count: 0, name: 'extension' },
      { type: 'string',     indexed: true,  analyzed: true,  count: 0, name: '_type' },
      { type: 'conflict',   indexed: false, analyzed: false, count: 0, name: 'custom_user_field' }
    ]);
  };
});