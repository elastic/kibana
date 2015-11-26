module.exports = function createTestData() {
  return {
    indexPatternWithMappings: {
      'title': 'logstash-*',
      'time_field_name': '@timestamp',
      'fields': [{
        'name': 'geo.coordinates',
        'count': 0,
        'scripted': false,
        'mapping': {'type': 'geo_point', 'index': 'not_analyzed', 'doc_values': false}
      }, {
        'name': 'ip',
        'count': 2,
        'scripted': false,
        'mapping': {'type': 'ip', 'index': 'not_analyzed', 'doc_values': true}
      }, {
        'name': '@timestamp',
        'count': 0,
        'scripted': false,
        'mapping': {'type': 'date', 'index': 'not_analyzed', 'doc_values': true}
      }, {
        'name': 'agent',
        'count': 0,
        'scripted': false,
        'mapping': {'type': 'string', 'index': 'analyzed', 'doc_values': false}
      }, {
        'name': 'bytes',
        'count': 2,
        'scripted': false,
        'mapping': {'type': 'number', 'index': 'not_analyzed', 'doc_values': true}
      }]
    }
  };
};
