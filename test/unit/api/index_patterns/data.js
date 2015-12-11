module.exports = function createTestData() {
  return {
    indexPatternWithTemplate: {
      'data': {
        'type': 'index_patterns',
        'id': 'logstash-*',
        'attributes': {
          'title': 'logstash-*',
          'time_field_name': '@timestamp',
          'fields': [{
            'name': 'ip',
            'count': 2,
            'scripted': false
          }, {
            'name': '@timestamp',
            'count': 0,
            'scripted': false
          }, {
            'name': 'agent',
            'count': 0,
            'scripted': false
          }, {
            'name': 'bytes',
            'count': 2,
            'scripted': false
          }]
        },
        'relationships': {
          'template': {
            'data': {'type': 'index_templates', 'id': 'kibana-logstash-*'}
          }
        }
      },
      'included': [{
        'type': 'index_templates',
        'id': 'kibana-logstash-*',
        'attributes': {
          'template': 'logstash-*',
          'order': 0,
          'mappings': {
            '_default_': {
              'properties': {
                'ip': {'type': 'ip', 'index': 'not_analyzed', 'doc_values': true},
                '@timestamp': {'type': 'date', 'index': 'not_analyzed', 'doc_values': true},
                'agent': {'type': 'string', 'index': 'analyzed', 'doc_values': false},
                'bytes': {'type': 'long', 'index': 'not_analyzed', 'doc_values': true}
              }
            }
          }
        }
      }]
    }
  };
};
