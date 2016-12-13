import { bgRed, white } from 'ansicolors';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

export default function (grunt) {

  grunt.registerTask('sterilize', function () {

    const cmd = 'git clean -fdx';
    const ignores = [
      '.aws-config.json',
      'config/kibana.dev.yml'
    ]
    .concat(String(grunt.option('ignore') || '').split(','))
    .map(f => `-e "${f.split('"').join('\\"')}"`)
    .reduce((all, arg) => `${all} ${arg}`, '');

    const stdio = 'inherit';
    execSync(`${cmd} -n ${ignores}`, { stdio });

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const danger = bgRed(white('DANGER'));

    rl.on('close', this.async());
    rl.question(`\n${danger} Do you really want to delete all of the above files?, [N/y] `, function (resp) {
      const yes = resp.toLowerCase().trim()[0] === 'y';
      rl.close();

      if (yes) {
        execSync(`${cmd} ${ignores}`, { stdio });
      }
    });

  });

}
