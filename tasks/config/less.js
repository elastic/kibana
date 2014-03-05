module.exports = {
  src: {
    src: [
      '<%= app %>/**/styles/**/*.less',
      '!<%= src %>/**/_*.less'
    ],
    expand: true,
    ext: '.css',
    options: {
      ieCompat: false
    }
  }
};