module.exports = {
  settings: {
    number_of_shards: 1
  },
  mappings: {
    config: {
      properties: {
        buildNum: {
          type: 'keyword',
          index: true
        }
      }
    }
  }
};
