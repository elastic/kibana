module.exports = function(config) {
  return {
    // copy source to temp, we will minify in place for the dist build
    dev_marvel_config: {
      options: {
        patterns: [
          {
            match: 'port',
            replacement: '<%= port.dev %>',
          }
        ]
      },
      files: [
        {expand: true, flatten: true, src: ['./config.js'], dest: 'src/'}
      ]
    },
    dist_marvel_config: {
      options: {
        patterns: [
          {
            match: 'port',
            replacement: '<%= port.dist %>',
          }
        ]
      },
      files: [
        {expand: true, flatten: true, src: ['./config.js'], dest: 'src/'}
      ]
    }
  };
};