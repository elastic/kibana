module.exports = function createTestData() {
  return {
    'index_pattern': {
      'id': 'logstash-*',
      'title': 'logstash-*',
      'time_field_name': '@timestamp',
      'fields': [
        {
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
        }
      ]
    },
    pipeline: [{
      processor_id: 'processor1',
      type_id: 'set',
      target_field: 'foo',
      value: 'bar',
      ignore_failure: false
    }]
  };
};
