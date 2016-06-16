import { execFileSync } from 'child_process';
import { join } from 'path';

export default (grunt) => {
  grunt.registerTask('_rebuild:createArchives', function () {
    const buildDir = grunt.config.get('buildDir');
    const targetDir = grunt.config.get('target');

    grunt.file.mkdir('target');

    grunt.file.expand({ cwd: buildDir }, '*').forEach(build => {
      const tar = join(targetDir, `${build}.tar.gz`);
      execFileSync('tar', ['-zchf', tar, build], { cwd: buildDir });

      const zip = join(targetDir, `${build}.zip`);
      if (/windows/.test(build)) {
        execFileSync('zip', ['-rq', '-ll', zip, build], { cwd: buildDir });
      } else {
        execFileSync('zip', ['-rq', zip, build], { cwd: buildDir });
      }
    });
  });
};
