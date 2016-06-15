import { execFileSync } from 'child_process';

export default (grunt) => {
  grunt.registerTask('_rebuild:extractZips', function () {
    const buildDir = grunt.config.get('buildDir');
    const targetDir = grunt.config.get('target');

    const zips = grunt.file.expand({ cwd: targetDir }, '*.zip');

    zips.forEach(zip => {
      execFileSync('unzip', [zip, '-d', buildDir], { cwd: targetDir });
    });
  });
};
