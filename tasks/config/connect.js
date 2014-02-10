module.exports = {
  dev: {
    options: {
      base: '<%= src %>'
    }
  },
  test: {
    options: {
      base: [
        '<%= unitTestDir %>',
        '<%= src %>',
        '<%= root %>/node_modules/mocha',
        '<%= root %>/node_modules/expect.js'
      ]
    }
  }
};