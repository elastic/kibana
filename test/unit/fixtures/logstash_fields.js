define(function (require) {
  function stubbedLogstashFields() {
    var sourceData = [
      { name: 'bytes',              type: 'number',     indexed: true,  analyzed: true,   count: 10 },
      { name: 'ssl',                type: 'boolean',    indexed: true,  analyzed: true,   count: 20 },
      { name: '@timestamp',         type: 'date',       indexed: true,  analyzed: true,   count: 30 },
      { name: 'utc_time',           type: 'date',       indexed: true,  analyzed: true },
      { name: 'phpmemory',          type: 'number',     indexed: true,  analyzed: true },
      { name: 'ip',                 type: 'ip',         indexed: true,  analyzed: true },
      { name: 'request_body',       type: 'attachment', indexed: true,  analyzed: true },
      { name: 'point',              type: 'geo_point',  indexed: true,  analyzed: true },
      { name: 'area',               type: 'geo_shape',  indexed: true,  analyzed: true },
      { name: 'extension',          type: 'string',     indexed: true,  analyzed: true },
      { name: 'machine.os',         type: 'string',     indexed: true,  analyzed: true },
      { name: 'geo.src',            type: 'string',     indexed: true,  analyzed: true },
      { name: '_type',              type: 'string',     indexed: true,  analyzed: true },
      { name: 'custom_user_field',  type: 'conflict',   indexed: false, analyzed: false },
      { name: 'scritped string',    type: 'string',     scripted: true, script: '\'i am a string\''},
      { name: 'scritped number',    type: 'number',     scripted: true, script: '1234'},
    ].map(function (field) {
      field.count = field.count || 0;
      field.scripted = field.scripted || false;
      return field;
    });

    return sourceData;
  }

  return stubbedLogstashFields;
});