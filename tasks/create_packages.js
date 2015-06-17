var child_process = require('child_process');
var Promise = require('bluebird');
var join = require('path').join;
var mkdirp = Promise.promisifyAll(require('mkdirp'));

var execFile = Promise.promisify(child_process.execFile);

var getBaseNames = function (grunt) {
  var packageName = grunt.config.get('pkg.name');
  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');
  return platforms.map(function (platform) {
    return packageName + '-' + version + '-' + platform;
  });
};

function createPackages(grunt) {
  grunt.registerTask('create_packages', function () {
    var done = this.async();
    var target = grunt.config.get('target');
    var distPath = join(grunt.config.get('build'), 'dist');
    var version = grunt.config.get('pkg.version');

    var createPackage = function (name) {
      var options = { cwd: distPath };
      var archiveName = join(target, name);
      var commands = [];
      var arch = /x64$/.test(name) ? 'x86_64' : 'i686';

      var fpm_options = [ 'fpm', '-f', '-p', target, '-s', 'dir', '-n', 'kibana', '-v', version,
                          '--after-install', join(distPath, 'user', 'installer.sh'),
                          '--after-remove', join(distPath, 'user', 'remover.sh'),
                          '--config-files', '/opt/kibana/config/kibana.yml' ];
      var fpm_files = join(distPath, name) + '/=/opt/kibana';

      // kibana.tar.gz
      commands.push([ 'tar', '-zcf', archiveName + '.tar.gz', name ]);

      // kibana.zip
      if (/windows/.test(name)) {
        commands.push([ 'zip', '-rq', '-ll', archiveName + '.zip', name ]);
      } else {
        commands.push([ 'zip', '-rq', archiveName + '.zip', name ]);
      }

      if (grunt.option('os-packages')) {
        // TODO(sissel): Add before-install scripts to create kibana user
        // TODO(sissel): Check if `fpm` is available
        if (/linux-x(86|64)$/.test(name)) {
          // kibana.rpm and kibana.deb
          var sysv_init = join(distPath, 'services', 'sysv') + '/etc/=/etc/';
          commands.push(fpm_options.concat(['-t', 'rpm', '-a', arch, '--rpm-os', 'linux', fpm_files, sysv_init]));
          commands.push(fpm_options.concat(['-t', 'deb', '-a', arch, fpm_files, sysv_init]));
        } else if (/darwin-x(86|64)$/.test(name)) {
          // kibana.pkg
          var launchd = join(distPath, 'services', 'launchd') + '/=/';
          commands.push(fpm_options.concat(['-t', 'osxpkg', '-a', arch, fpm_files, launchd]));
        }
      }

      return mkdirp.mkdirpAsync(target)
        .then(function (arg) {
          return Promise.map(commands, function (cmd) {
            return execFile(cmd.shift(), cmd, options);
          });
        }, function (err) { console.log('Failure on ' + name + ': ' + err); });
    };

    Promise.map(getBaseNames(grunt), createPackage).finally(done);
  });
}

module.exports = createPackages;
createPackages.getBaseNames = getBaseNames;
