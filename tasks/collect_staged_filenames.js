import { resolve } from 'path';
import SimpleGit from 'simple-git';
import { promisify } from 'bluebird';

const root = resolve(__dirname, '..');
const simpleGit = new SimpleGit(root);
const diff = promisify(simpleGit.diff, simpleGit);

export default function (grunt) {
  grunt.registerTask('collectStagedFiles', function () {
    diff(['--name-status', '--cached'])
    .then(output => {
      const files = output
      .split('\n')
      .map(line => line.trim().split('\t'))
      .map(parts => {
        const status = parts.shift();
        if (status === 'D' || status === 'U') return;
        return parts.join('\t').trim();
      })
      .filter(Boolean);

      grunt.log.ok(files.length + ' staged files');
      grunt.config.set('stagedFiles', files);
    })
    .nodeify(this.async());
  });
};
