module.exports = function createTestData() {
  return {
    indexPattern: {
      'data': {
        'type': 'index_patterns',
        'id': 'logstash-*',
        'attributes': {
          'title': 'logstash-*',
          'time_field_name': '@timestamp',
          'fields': [{
            'name': 'ip',
            'type': 'ip',
            'count': 2,
            'scripted': false,
            'indexed': true,
            'analyzed': false,
            'doc_values': false
          }, {
            'name': '@timestamp',
            'type': 'date'
          }, {
            'name': 'agent',
            'type': 'string',
            'indexed': true,
            'analyzed': true,
            'doc_values': false
          }, {
            'name': 'bytes',
            'type': 'long'
          }]
        }
      }
    }
  };
};
