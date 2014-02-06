module.exports = function (grunt) {
  return {
    shard_allocation: {
      options: {
        paths: ['kibana/panels/shard_allocation/css']
      },
      files: {
        'kibana/panels/shard_allocation/css/style.css': 'kibana/panels/shard_allocation/css/style.less' 
      }
    }
  };
};
