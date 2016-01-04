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
            'scripted': false
          }, {
            'name': '@timestamp',
            'type': 'date',
            'count': 0,
            'scripted': false
          }, {
            'name': 'agent',
            'type': 'string',
            'count': 0,
            'scripted': false
          }, {
            'name': 'bytes',
            'type': 'long',
            'count': 2,
            'scripted': false
          }]
        }
      }
    }
  };
};
