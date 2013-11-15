module.exports = function(config) {
  return {
    // copy source to temp, we will minify in place for the dist build
    marvel_config: {
      cwd: '.',
      src: ['config.js'],
      dest: '<%= baseDir %>/src/'
    }
  };
};