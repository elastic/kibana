module.exports = function (config) {
  return {
    // copy source to temp, we will minify in place for the dist build
    dev_marvel_config: {
      options: {
        patterns: [
          {
            match: 'port',
            replacement: '<%= esPort.dev %>',
          },
          {
            match: 'default_route',
            replacement: '<%= defaultRoute.dev %>',
          }
        ]
      },
      files: [
        {expand: true, flatten: true, src: ['./config.js'], dest: '<%= buildTempDir %>'}
      ]
    },
    dist_marvel_config: {
      options: {
        patterns: [
          {
            match: 'port',
            replacement: '<%= esPort.dist %>',
          },
          {
            match: 'default_route',
            replacement: '<%= defaultRoute.dist %>',
          }
        ]
      },
      files: [
        {expand: true, flatten: true, src: ['./config.js'], dest: '<%= buildTempDir %>'}
      ]
    }
  };
};