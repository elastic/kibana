module.exports = function (grunt) {
  return {
    test: {
      files: ['<%= unitTestDir %>/**/*.js'],
      tasks: ['mocha:unit']
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
        '<%= root %>/**/*.jade',
        '!<%= root %>/node_modules/**/*',
        '!<%= src %>/bower_components/**/*'
      ],
      tasks: ['jade']
    }
  };
};
