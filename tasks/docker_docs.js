import rimraf from 'rimraf';
import { join } from 'path';
import { execFileSync as exec } from 'child_process';

export default function (grunt) {
  grunt.registerTask('docker:docs', 'Build docs from docker', function () {
    const rootPath = grunt.config.get('root');
    const composePath = join(rootPath, 'tasks/docker_docs/docker-compose.yml');
    const htmlDocsDir = join(rootPath, 'html_docs');

    const env = Object.assign(process.env, {
      KIBANA_DOCS_CONTAINER_NAME: 'kibana_docs',
      KIBANA_DOCS_CONTEXT: rootPath
    });
    const stdio = [0, 1, 2];
    const execOptions = { env, stdio };

    exec('docker-compose', [
      '-f', composePath,
      'up'
    ], execOptions);

    const containerId = String(exec('docker-compose', [
      '-f', composePath,
      'ps',
      '-q', env.KIBANA_DOCS_CONTAINER_NAME
    ], { env })).trim();

    grunt.log.write('Clearing old docs ... ');
    rimraf.sync(htmlDocsDir);
    grunt.log.writeln('done');

    grunt.log.write('Copying new docs ... ');
    exec('docker', [
      'cp',
      `${containerId}:/home/kibana/html_docs`,
      htmlDocsDir
    ]);
    grunt.log.writeln('done');
  });
}
