import { resolve } from 'path';
module.exports = grunt => ({
  options: {
    paths: [
      'Gruntfile.js',
      'bin',
      'config',
      'src',
      'tasks',
      'test',
      'utilities',
    ],
  },

  source: {
    options: {
      cache: resolve(grunt.config.get('root'), '.eslint.fixSource.cache')
    }
  },

  fixSource: {
    options: {
      cache: resolve(grunt.config.get('root'), '.eslint.fixSource.cache'),
      fix: true
    }
  },

  staged: {
    options: {
      paths: null // overridden by lintStagedFiles task
    }
  }
});
