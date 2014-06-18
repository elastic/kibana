module.exports = function (grunt) {
  var Promise = require('bluebird');
  var spawn = require('./utils/spawn');
  var installOrUpdateRepo = require('./utils/install_or_update_repo');

  // bower update elasticsearch && bower update k4d3 && npm run rebuild-esjs"
  grunt.registerTask('update', [
    'update-esjs',
  ]);

  // cd ./src/bower_components/elasticsearch && npm install && grunt browser_clients:build
  grunt.registerTask('update-esjs', function () {
    var esjsDir = grunt.config('esjsDir');

    installOrUpdateRepo(grunt.config('esjsRepo'), esjsDir)
      .then(function (updated) {
        if (updated) return spawn('grunt', ['browser_clients:build'], esjsDir)();
      })
      .nodeify(this.async());
  });
};