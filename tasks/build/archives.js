module.exports = function createPackages(grunt) {
  let { config } = grunt;
  let { resolve, relative } = require('path');
  let { execFile } = require('child_process');
  let { all, fromNode } = require('bluebird');

  const targetDir = config.get('target');
  let buildPath = resolve(config.get('root'), 'build');
  let exec = async (cmd, args) => {
    grunt.log.writeln(` > ${cmd} ${args.join(' ')}`);
    await fromNode(cb => execFile(cmd, args, { cwd: buildPath }, cb));
  };


  let archives = async (platform) => {
    // kibana.tar.gz
    await exec('tar', ['-zchf', relative(buildPath, platform.tarPath), platform.buildName]);

    // kibana.zip
    if (/windows/.test(platform.name)) {
      await exec('zip', ['-rq', '-ll', relative(buildPath, platform.zipPath), platform.buildName]);
    } else {
      await exec('zip', ['-rq', relative(buildPath, platform.zipPath), platform.buildName]);
    }
  };

  grunt.registerTask('_build:archives', function () {

    all(
      grunt.config.get('platforms')
      .map(async platform => {

        grunt.file.mkdir(targetDir);
        await archives(platform);
      })
    )
    .nodeify(this.async());

  });
};
