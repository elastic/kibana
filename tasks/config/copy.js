module.exports = function (grunt) {
  return {
    devSource: {
      options: { mode: true },
      src: [
        'src/**',
        'bin/**',
        'webpackShims/**',
        'config/kibana.yml',
        '!src/**/__tests__/**',
        '!src/test_utils/**',
        '!src/fixtures/**',
        '!src/plugins/dev_mode/**',
        '!src/plugins/tests_bundle/**',
        '!src/plugins/console/public/tests/**',
        '!src/cli/cluster/**',
      ],
      dest: 'build/kibana',
      expand: true
    },
  };
};
