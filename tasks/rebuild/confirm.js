import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

export default (grunt) => {
  grunt.registerTask('_rebuild:confirm', function () {
    const newVersion = grunt.option('buildversion') || grunt.config.get('pkg').version;
    const newBuildNum = grunt.option('buildnum') || grunt.config.get('build.number');
    const newSha = grunt.option('buildsha') || grunt.config.get('build.sha');

    grunt.config('rebuild', { newVersion, newBuildNum, newSha });

    grunt.log.writeln('Targets will be rebuilt with the following:');
    grunt.log.writeln(`Version: ${newVersion}`);
    grunt.log.writeln(`Build number: ${newBuildNum}`);
    grunt.log.writeln(`Build sha: ${newSha}`);

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('close', this.async());

    rl.question('Do you want to rebuild these packages? [N/y] ', (resp) => {
      const answer = resp.toLowerCase().trim();

      if (answer === 'y') {
        grunt.config.set('rebuild.continue', true);
      }

      rl.close();
    });
  });
};
