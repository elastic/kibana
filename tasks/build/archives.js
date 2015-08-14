module.exports = function createPackages(grunt) {
  let { config } = grunt;
  let { resolve } = require('path');
  let { execFile } = require('child_process');
  let { all, fromNode } = require('bluebird');

  let rootDir = config.get('root');
  let buildDir = resolve(rootDir, 'build');

  let exec = async (cmd, args) => {
    grunt.log.writeln(` > ${cmd} ${args.join(' ')}`);
    await fromNode(cb => execFile(cmd, args, { cwd: buildDir }, cb));
  };


  let archives = async (platform) => {
    let tarPath = resolve(rootDir, platform.tarPath);
    let zipPath = resolve(rootDir, platform.zipPath);

    // kibana.tar.gz
    await exec('tar', ['-zchf', tarPath, platform.buildName]);

    // kibana.zip
    if (/windows/.test(platform.name)) {
      await exec('zip', ['-rq', '-ll', zipPath, platform.buildName]);
    } else {
      await exec('zip', ['-rq', zipPath, platform.buildName]);
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
