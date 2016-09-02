module.exports = function () {
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
        '!src/core_plugins/dev_mode/**',
        '!src/core_plugins/tests_bundle/**',
        '!src/core_plugins/console/public/tests/**',
        '!src/cli/cluster/**',
      ],
      dest: 'build/kibana',
      expand: true
    },
  };
};
