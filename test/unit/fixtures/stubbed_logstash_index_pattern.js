define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    var StubIndexPattern = Private(require('test_utils/stub_index_pattern'));
    var fieldFormats = Private(require('components/index_patterns/_field_formats'));

    return new StubIndexPattern('logstash-*', 'time', [
      { name: 'bytes',              displayName: 'bytes',             type: 'number',     indexed: true,  analyzed: true,   count: 10 },
      { name: 'ssl',                displayName: 'ssl',               type: 'boolean',    indexed: true,  analyzed: true,   count: 20 },
      { name: '@timestamp',         displayName: '@timestamp',        type: 'date',       indexed: true,  analyzed: true,   count: 30 },
      { name: 'phpmemory',          displayName: 'phpmemory',         type: 'number',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'ip',                 displayName: 'ip',                type: 'ip',         indexed: true,  analyzed: true,   count: 0 },
      { name: 'request_body',       displayName: 'request_body',      type: 'attachment', indexed: true,  analyzed: true,   count: 0 },
      { name: 'extension',          displayName: 'extension',         type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'point',              displayName: 'point',             type: 'geo_point',  indexed: true,  analyzed: true,   count: 0 },
      { name: 'area',               displayName: 'area',              type: 'geo_shape',  indexed: true,  analyzed: true,   count: 0 },
      { name: 'extension',          displayName: 'extension',         type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'machine.os',         displayName: 'machine.os',        type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'geo.src',            displayName: 'geo.src',           type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: '_type',              displayName: '_type',             type: 'string',     indexed: true,  analyzed: true,   count: 0 },
      { name: 'custom_user_field',  displayName: 'custom_user_field', type: 'conflict',   indexed: false, analyzed: false,  count: 0 }
    ]);
  };
});
