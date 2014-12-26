define(function (require) {
  return function stubbedLogstashIndexPatternService(Private) {
    var StubIndexPattern = Private(require('test_utils/stub_index_pattern'));
    var fieldTypes = Private(require('components/index_patterns/_field_types'));
    var mockLogstashFields = Private(require('fixtures/logstash_fields'));
    var flattenSearchResponse = require('components/index_patterns/_flatten_search_response');
    var flattenHit = require('components/index_patterns/_flatten_hit');
    var getComputedFields = require('components/index_patterns/_get_computed_fields');

    var _ = require('lodash');

    var fields = mockLogstashFields.map(function (field) {
      field.displayName = field.name;
      var type = fieldTypes.byName[field.type];
      if (!type) throw new TypeError('unknown type ' + field.type);
      if (!_.has(field, 'sortable')) field.sortable = type.sortable;
      if (!_.has(field, 'filterable')) field.filterable = type.filterable;
      return field;
    });

    var indexPattern = new StubIndexPattern('logstash-*', 'time', fields);

    indexPattern.getComputedFields = _.bind(getComputedFields, indexPattern);
    indexPattern.flattenSearchResponse = _.bind(flattenSearchResponse, indexPattern);
    indexPattern.flattenHit = _.bind(flattenHit, indexPattern);
    indexPattern.metaFields = ['_id', '_type', '_source'];

    return indexPattern;

  };
});
