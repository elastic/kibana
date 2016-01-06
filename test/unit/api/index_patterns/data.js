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
            'type': 'ip'
          }, {
            'name': '@timestamp',
            'type': 'date'
          }, {
            'name': 'agent',
            'type': 'string'
          }, {
            'name': 'bytes',
            'type': 'number'
          },
          {
            'name': 'geo.coordinates',
            'type': 'geo_point'
          }]
        }
      }
    }
  };
};
