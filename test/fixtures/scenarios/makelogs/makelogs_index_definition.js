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
            'type': 'text',
            'fields': {
              'raw': {
                'type': 'keyword',
              }
            }
          },
          'match_mapping_type': 'string',
          'match': '*'
        }
      }],
      'properties': {
        '@timestamp': {
          'type': 'date'
        },
        'id': {
          'type': 'integer',
          'index': true,
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
          'type': 'keyword'
        },
        'geo': {
          'properties': {
            'srcdest': {
              type: 'keyword'
            },
            'dest': {
              type: 'keyword'
            },
            'src': {
              type: 'keyword'
            },
            'coordinates': {
              'type': 'geo_point'
            }
          }
        },
        'meta': {
          'properties': {
            'related': {
              'type': 'text'
            },
            'char': {
              type: 'keyword'
            },
            'user': {
              'properties': {
                'firstname': {
                  'type': 'text'
                },
                'lastname': {
                  'type': 'integer',
                  'index': true
                }
              }
            }
          }
        }
      }
    }
  }
};
