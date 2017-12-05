import { join } from 'path';
import { platform as getPlatform } from 'os';

module.exports = function (grunt) {
  const exec = require('../utils/exec').silent;

  grunt.registerTask('_build:copyNodeForOptimize', function () {
    const rootPath = grunt.config.get('root');
    const nodeDestination = join(rootPath, 'build/kibana/node');
    const currentPlatform = getPlatform();
    const platformMap = {
      'linux-x86_64': 'linux',
      'darwin-x86_64': 'darwin',
      'windows-x86_64': 'win32'
    };

    const { nodeDir } = grunt.config.get('platforms').find(platform => {
      return platformMap[platform.name] === currentPlatform;
    });

    exec('cp', ['-r', nodeDir, nodeDestination]);
  });
};
