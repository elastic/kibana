module.exports = function (grunt) {
  return {
    test: {
      files: ['<%= unitTestDir %>/*.jade', '<%= unitTestDir %>/**/*.js'],
      tasks: ['jade:test', 'mocha:unit']
    },
    less: {
      files: [
        '<%= app %>/**/*.less',
        '<%= src %>/courier/**/*.less'
      ],
      tasks: ['less']
    },
    jade: {
      files: [
        '<%= app %>/**/*.jade',
        '<%= src %>/courier/**/*.jade',
        '!<%= unitTestDir %>/**/*.jade'
      ],
      tasks: ['jade']
    }
  };
};
