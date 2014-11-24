define(function (require) {
  return {
    test: {
      mappings: {
        testType: {
          'baz': {
            full_name: 'baz',
            mapping: {
              bar: {
                type: 'long'
              }
            }
          },
          'foo.bar': {
            full_name: 'foo.bar',
            mapping: {
              bar: {
                type: 'string',
              }
            }
          },
          'not_analyzed_field': {
            full_name: 'not_analyzed_field',
            mapping: {
              bar: {
                type: 'string',
                index: 'not_analyzed'
              }
            }
          },
          'index_no_field': {
            full_name: 'index_no_field',
            mapping: {
              bar: {
                type: 'string',
                index: 'no'
              }
            }
          },
          _id: {
            full_name: '_id',
            mapping: {
              _id: {
                store: false,
                index: 'no',
              }
            }
          },
          _timestamp: {
            full_name: '_timestamp',
            mapping: {
              _timestamp: {
                store: true,
                index: 'no',
              }
            }
          }
        }
      }
    }
  };
});