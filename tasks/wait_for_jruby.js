var request = require('request');
module.exports = function (grunt) {

  grunt.registerTask('wait_for_jruby', 'Is it started yet?', function () {
    var done = this.async();
    function checkJRuby() {
      request('http://127.0.0.1:5601', function (err, resp) {
        if (err) {
          setTimeout(checkJRuby, 1000);
        } else {
          done();
        }
      });
    }
    checkJRuby();

  });
};
