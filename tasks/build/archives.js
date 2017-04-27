import { execFile } from 'child_process';
import { all, fromNode } from 'bluebird';
const isWin = /^win/.test(process.platform);

export default (grunt) => {
  const { config, log } = grunt;

  const cwd = config.get('buildDir');
  const targetDir = config.get('target');

  async function exec(cmd, args) {
    log.writeln(` > ${cmd} ${args.join(' ')}`);
    await fromNode(cb => execFile(cmd, args, { cwd }, cb));
  }

  async function archives({ name, buildName, zipPath, tarPath }) {
    if (isWin) {
      await exec('jar', ['-cMf', tarPath, buildName]);
      await exec('jar', ['-cMf', zipPath, buildName]);
    } else {
      await exec('tar', ['-chzf', tarPath, buildName]);
      if (/windows/.test(name)) {
        await exec('zip', ['-rq', '-ll', zipPath, buildName]);
      } else {
        await exec('zip', ['-rq', zipPath, buildName]);
      }
    }
  }

  grunt.registerTask('_build:archives', function () {
    grunt.file.mkdir(targetDir);

    all(
      config.get('platforms').map(async platform => await archives(platform))
    )
    .nodeify(this.async());

  });
};
