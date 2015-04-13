module.exports = {
  options: {
    sourceMapBasepath: '<%= src %>/kibana',
    sourceMapRootpath: '/',
    ieCompat: false,
    paths: [
      '<%= src %>/kibana/bower_components/lesshat/build/'
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
