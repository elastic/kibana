module.exports = {
  'settings': {
    'index': {
      'number_of_shards': 1,
      'number_of_replicas': 0
    },
    'analysis': {
      'analyzer': {
        'url': {
          'type': 'standard',
          'tokenizer': 'uax_url_email',
          'max_token_length': 1000
        }
      }
    }
  },
  'mappings': {
    '_default_': {
      'dynamic_templates': [{
        'string_fields': {
          'mapping': {
            'type': 'string'
          },
          'match_mapping_type': 'string',
          'match': '*'
        }
      }],
      '_timestamp': {
        'enabled': true
      },
      'properties': {
        '@timestamp': {
          'type': 'date'
        },
        'id': {
          'type': 'integer',
          'index': 'not_analyzed',
          'include_in_all': false
        },
        'clientip': {
          'type': 'ip'
        },
        'ip': {
          'type': 'ip'
        },
        'memory': {
          'type': 'double'
        },
        'referer': {
          'type': 'string',
          'index': 'not_analyzed'
        },
        'geo': {
          'properties': {
            'srcdest': {
              'type': 'string',
              'index': 'not_analyzed'
            },
            'dest': {
              'type': 'string',
              'index': 'not_analyzed'
            },
            'src': {
              'type': 'string',
              'index': 'not_analyzed'
            },
            'coordinates': {
              'type': 'geo_point'
            }
          }
        },
        'meta': {
          'properties': {
            'related': {
              'type': 'string'
            },
            'char': {
              'type': 'string',
              'index': 'not_analyzed'
            },
            'user': {
              'properties': {
                'firstname': {
                  'type': 'string'
                },
                'lastname': {
                  'type': 'integer',
                  'index': 'not_analyzed'
                }
              }
            }
          }
        }
      }
    }
  }
};
