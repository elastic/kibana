import { execSync } from 'child_process';
import { trim } from 'lodash';

/**
 * Repackages all of the current archives in target/ with the same build
 * number, sha, and commit hash. This is useful when all you need to do is bump
 * the version of the release and do not want to introduce any other changes.
 *
 * Even if there are new commits, the standard build task reinstalls all npm
 * dependencies, which introduces at least a small amount of risk of
 * introducing bugs into the build since not all dependencies have fixed
 * versions.
 *
 * Options:
 *   --skip-archives        Will skip the archive step, useful for debugging
 *   --buildversion="1.2.3" Sets new version to 1.2.3
 *   --buildnum="99999"     Sets new build number to 99999
 *   --buildsha="9a5b2c1"   Sets new build sha to 9a5b2c1 (use the full sha, though)
 */
export default (grunt) => {
  grunt.registerTask('rebuild', 'Rebuilds targets as a new version', function () {
    grunt.task.run([
      '_rebuild:confirm',
      '_rebuild:continue'
    ]);
  });

  grunt.registerTask('_rebuild:continue', function () {
    grunt.task.requires('_rebuild:confirm');

    if (!grunt.config.get('rebuild.continue')) {
      grunt.log.writeln('Aborting without rebuilding anything');
    } else {
      grunt.task.run([
        '_rebuild:builds',
        '_rebuild:archives'
      ]);
    }
  });

  grunt.registerTask('_rebuild:builds', function () {
    grunt.task.requires('_rebuild:continue');

    grunt.task.run([
      'clean:build',
      '_rebuild:extractZips',
      '_rebuild:updateBuilds'
    ]);
  });

  grunt.registerTask('_rebuild:archives', function () {
    grunt.task.requires('_rebuild:continue');

    const skip = grunt.option('skip-archives');
    if (skip) {
      grunt.log.writeln('Skipping archive step since rebuild debugging was enabled');
    } else {
      grunt.task.run([
        'clean:target',
        '_rebuild:createArchives',
        '_build:shasums'
      ]);
    }
  });
};
