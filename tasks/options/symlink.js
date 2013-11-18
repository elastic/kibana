module.exports = function (config) {
  return {
    build_npm: {
      files: [
        {
          src: 'node_modules',
          dest: '<%= buildMergeDir %>/node_modules'
        }
      ]
    }
  };
};