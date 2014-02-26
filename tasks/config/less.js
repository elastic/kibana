module.exports = {
  src: {
    src: [
      '<%= app %>/styles/**/*.less',
      '<%= app %>/apps/**/*.less',
      '!<%= src %>/**/_*.less'
    ],
    expand: true,
    ext: '.css',
    options: {
      ieCompat: false
    }
  }
};