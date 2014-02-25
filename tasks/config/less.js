module.exports = {
  src: {
    src: [
      '<%= app %>/styles/**/*.less',
      '<%= app %>/apps/**/*.less',
      '!_*.less'
    ],
    expand: true,
    ext: '.css',
    options: {
      ieCompat: false
    }
  }
};