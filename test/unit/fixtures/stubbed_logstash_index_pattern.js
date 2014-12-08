define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    var StubIndexPattern = Private(require('test_utils/stub_index_pattern'));
    var flattenSearchResponse = require('components/index_patterns/_flatten_search_response');
    var flattenHit = require('components/index_patterns/_flatten_hit');
    var fieldTypes = Private(require('components/index_patterns/_field_types'));
    var getComputedFields = require('components/index_patterns/_get_computed_fields');

    var _ = require('lodash');

    var indexPattern = new StubIndexPattern('logstash-*', 'time', [
      { name: 'bytes',              type: 'number',     indexed: true,  analyzed: true,   count: 10 },
      { name: 'ssl',                type: 'boolean',    indexed: true,  analyzed: true,   count: 20 },
      { name: '@timestamp',         type: 'date',       indexed: true,  analyzed: true,   count: 30 },
      { name: 'utc_time',           type: 'date',       indexed: true,  analyzed: true,   count: 0 },
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
    ].map(function (field) {
      field.displayName = field.name;
      var type = fieldTypes.byName[field.type];
      if (!type) throw new TypeError('unknown type ' + field.type);
      if (!_.has(field, 'sortable')) field.sortable = type.sortable;
      if (!_.has(field, 'filterable')) field.filterable = type.filterable;
      return field;
    }));

    indexPattern.getComputedFields = _.bind(getComputedFields, indexPattern);
    indexPattern.flattenSearchResponse = _.bind(flattenSearchResponse, indexPattern);
    indexPattern.flattenHit = _.bind(flattenHit, indexPattern);
    indexPattern.metaFields = ['_id', '_type', '_source'];

    return indexPattern;

  };
});
