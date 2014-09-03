define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    var StubIndexPattern = Private(require('test_utils/stub_index_pattern'));
    return new StubIndexPattern('logstash-*', 'time', [
      { type: 'number',     name: 'bytes' },
      { type: 'boolean',    name: 'ssl' },
      { type: 'date',       name: '@timestamp' },
      { type: 'ip',         name: 'ip' },
      { type: 'attachment', name: 'request_body' },
      { type: 'string',     name: 'extension' },
      { type: 'geo_point',  name: 'point' },
      { type: 'geo_shape',  name: 'area' },
      { type: 'string',     name: 'extension' },
      { type: 'conflict',   name: 'custom_user_field' }
    ]);
  };
});