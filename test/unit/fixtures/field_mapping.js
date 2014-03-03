define(function (require) {
  return {
    test: {
      mappings: {
        testType: {
          'foo.bar': {
            full_name: 'foo.bar',
            mapping: {
              bar: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  };
});