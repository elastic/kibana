var child_process = require('child_process');
var Promise = require('bluebird');
var join = require('path').join;
var mkdirp = Promise.promisifyAll(require('mkdirp'));
var execFile = Promise.promisify(child_process.execFile);

function createServices(grunt) {
  grunt.registerTask('create_services', function () {
    var done = this.async();
    var target = grunt.config.get('target');
    var distPath = join(grunt.config.get('build'), 'dist');
    var services = grunt.config.get('services');

    var createService = function (arg) {
      var service = arg[0];
      var service_version = arg[1];
      var options = { cwd: distPath };
      var output = join(distPath, 'services', service);
      var pleaserun_args = ['--install', '--no-install-actions',
                            '--install-prefix', output, '--overwrite',
                            '--user', 'kibana',
                            '--sysv-log-path', '/var/log/kibana/',
                            '-p', service, '-v', service_version,
                            '/opt/kibana/bin/kibana'];

      return mkdirp.mkdirpAsync(target)
        .then(function (arg) {
          return execFile('pleaserun', pleaserun_args, options);
        }, function (err) { console.log('pleaserun failed: ' + err + '. Args: ' + pleaserun_args.join(' ')); });
    };

    // TODO(sissel): Detect if 'pleaserun' is found, and provide a useful error
    // to the user if it is missing.
    mkdirp.mkdirpAsync(distPath)
      .then(function () {
        return Promise.map(services, createService);
      })
      .then(function (arg) {
        // Create the user-management scripts
        var output = join(distPath, 'user');
        return mkdirp.mkdirpAsync(output).then(function () {
          return execFile('please-manage-user', ['--output', output, 'kibana'], { cwd: distPath });
        });
      }, function (err) { console.log('please-manage-user failed: ' + err + '.'); })
      .finally(done);
  });
}

module.exports = createServices;
