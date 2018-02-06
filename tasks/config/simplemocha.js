import { createAutoJunitReporter } from '../../src/dev';

export default {
  options: {
    timeout: 10000,
    slow: 5000,
    ignoreLeaks: false,
    reporter: createAutoJunitReporter({
      reportName: 'Server Mocha Tests'
    }),
    globals: ['nil'],
  },
  all: {
    src: [
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'packages/kbn-build/**/__tests__/**/*.js',
      'tasks/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!**/__tests__/fixtures/**/*',
      '!src/**/public/**',
      '!**/_*.js'
    ]
  }
};
