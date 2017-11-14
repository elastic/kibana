import rimraf from 'rimraf';
import { join } from 'path';
import { execFileSync as exec } from 'child_process';

module.exports = function (grunt) {
  grunt.registerTask('docker:packages', 'Build packages from docker', function () {
    const composePath = join(grunt.config.get('root'), 'tasks/build/docker/packages/docker-compose.yml');
    const env = Object.assign(process.env, {
      KIBANA_NODE_VERSION:  grunt.config.get('nodeVersion'),
      KIBANA_BUILD_CONTEXT: grunt.config.get('root'),
      KIBANA_BUILD_OPTIONS: grunt.option.flags().join(' '),
      KIBANA_BUILD_CONTAINER_NAME: 'kibana_build',
      KIBANA_FOLDER: '/home/kibana/repo'
    });
    const stdio = [0, 1, 2];
    const execOptions = { env, stdio };

    const useCache = grunt.option('cache');

    const targetDir = join(grunt.config.get('root'), 'target');
    const buildDir = join(grunt.config.get('root'), 'build');

    exec('docker-compose', [
      '-f', composePath,
      'build',
      useCache ? '' : '--no-cache',
    ].filter(Boolean), execOptions);
    exec('docker-compose', [
      '-f', composePath,
      'up'
    ], execOptions);

    const containerId = String(exec('docker-compose', [
      '-f', composePath,
      'ps',
      '-q', env.KIBANA_BUILD_CONTAINER_NAME
    ], { env })).trim();

    rimraf.sync(targetDir);
    rimraf.sync(buildDir);

    exec('docker', [
      'cp',
      `${containerId}:${env.KIBANA_FOLDER}/target`,
      targetDir
    ]);
    exec('docker', [
      'cp',
      `${containerId}:${env.KIBANA_FOLDER}/build`,
      buildDir
    ], execOptions);

    exec('docker-compose', [
      '-f', composePath,
      'rm',
      '--force'
    ], execOptions);
  });
};
