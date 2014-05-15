var glob = require('glob');
module.exports = function (grunt) {
  var tests = glob.sync('./test/unit/**/*.js').map(function (file) {
    return file.replace(/^\./,'');
  });
  return {
    test: {
      options: {
        data: {
          tests: JSON.stringify(tests),
          host: '<%= kibanaHost %>'
        },
        client: false
      },
      files: {
        './test/index.html': './test/templates/index.jade'
      }
    }
  };
};
