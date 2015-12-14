module.exports = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1
  },
  mappings: {
    config: {
      properties: {
        buildNum: {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    }
  }
};
