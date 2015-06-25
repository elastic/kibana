module.exports = {
  options: {
    sourceMapBasepath: '<%= src %>/kibana',
    sourceMapRootpath: '/',
    sourceMapFileInline: true,
    ieCompat: false,
    paths: [
      'bower_components/lesshat/build/',
      'bower_components',
      'src/ui'
    ]
  },
  dev: {
    src: '<%= lessFiles %>',
    expand: true,
    ext: '.css',
    options: {
      sourceMap: true
    }
  },
  build: {
    src: '<%= lessFiles %>',
    expand: true,
    ext: '.css',
    options: {
      sourceMap: false
    }
  }
};
