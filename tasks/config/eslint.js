import { resolve } from 'path';
export default grunt => ({
  options: {
    paths: [
      'Gruntfile.js',
      'bin',
      'config',
      'src',
      'scripts',
      'tasks',
      'test',
      'ui_framework/src',
      'ui_framework/doc_site/src',
      'ui_framework/generator_kui',
      'utilities',
      'webpackShims',
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
