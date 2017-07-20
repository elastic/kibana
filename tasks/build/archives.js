import { execFile } from 'child_process';
import { all, fromNode } from 'bluebird';

export default (grunt) => {
  const { config, log } = grunt;

  const cwd = config.get('buildDir');
  const targetDir = config.get('target');

  async function exec(cmd, args) {
    log.writeln(` > ${cmd} ${args.join(' ')}`);
    await fromNode(cb => execFile(cmd, args, { cwd }, cb));
  }

  async function archives({ name, buildName, zipPath, tarPath }) {
    if (/windows/.test(name)) {
      await exec('zip', ['-rq', '-ll', zipPath, buildName]);
    } else {
      const tarArguments = ['-zchf', tarPath, buildName];

      // Add a flag to handle filepaths with colons (i.e. C://...) on windows
      if (/^win/.test(process.platform)) {
        tarArguments.push('--force-local');
      }

      await exec('tar', tarArguments);
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
