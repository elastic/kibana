module.exports = function createPackages(grunt) {
  let { config } = grunt;
  let { resolve } = require('path');
  let { execFile } = require('child_process');
  let { all, fromNode } = require('bluebird');

  let version = config.get('pkg.version');
  let rootDir = config.get('root');
  let targetDir = resolve(rootDir, 'target');
  let buildDir = resolve(rootDir, 'build/kibana');

  let exec = async (cmd, args) => {
    grunt.log.writeln(` > ${cmd} ${args.join(' ')}`);
    await fromNode(cb => execFile(cmd, args, { cwd: rootDir }, cb));
  };

  let archives = async (platform) => {
    // kibana.tar.gz
    await exec('tar', ['-zchf', platform.tarPath, platform.buildDir]);

    // kibana.zip
    if (/windows/.test(platform.name)) {
      await exec('zip', ['-rq', '-ll', platform.zipPath, platform.buildDir]);
    } else {
      await exec('zip', ['-rq', platform.zipPath, platform.buildDir]);
    }
  };

  grunt.registerTask('build:archives', function () {

    all(
      grunt.config.get('platforms')
      .map(async platform => {

        grunt.file.mkdir('target');
        await archives(platform);
      })
    )
    .nodeify(this.async());

  });
};
