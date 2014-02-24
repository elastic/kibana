module.exports = function (grunt) {
  return {
    test: {
      files: ['<%= unitTestDir %>/*.jade', '<%= unitTestDir %>/**/*.js'],
      tasks: ['jade:test', 'mocha:unit']
    },
    src: {
      files: ['<%= src %>'],
      tasks: ['less']
    }
  };
};
