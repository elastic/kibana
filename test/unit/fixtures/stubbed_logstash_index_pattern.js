define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    var StubIndexPattern = Private(require('test_utils/stub_index_pattern'));
    var fieldFormats = Private(require('components/index_patterns/_field_formats'));

    return new StubIndexPattern('logstash-*', 'time', [
      { name: 'bytes',              type: 'number',     indexed: true,  analyzed: true,   count: 10 },
      { name: 'ssl',                type: 'boolean',    indexed: true,  analyzed: true,   count: 20 },
      { name: '@timestamp',         type: 'date',       indexed: true,  analyzed: true,   count: 30 },
      { name: 'phpmemory',          type: 'number',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'ip',                 type: 'ip',         indexed: true,  analyzed: true,   count: 0 },
      { name: 'request_body',       type: 'attachment', indexed: true,  analyzed: true,   count: 0 },
      { name: 'extension',          type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'point',              type: 'geo_point',  indexed: true,  analyzed: true,   count: 0 },
      { name: 'area',               type: 'geo_shape',  indexed: true,  analyzed: true,   count: 0 },
      { name: 'extension',          type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'machine.os',         type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'geo.src',            type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: '_type',              type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'custom_user_field',  type: 'conflict',   indexed: false, analyzed: false,  count: 0 }
    ]);
  };
});
