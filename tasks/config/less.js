module.exports = {
  src: {
    src: [
      '<%= app %>/styles/**/*.less',
      '<%= app %>/apps/**/*.less'
    ],
    expand: true,
    ext: '.css',
    options: {
      ieCompat: false
    }
  }
};