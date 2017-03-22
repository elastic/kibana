module.exports = function () {
  return {
    devSource: {
      options: { mode: true },
      src: [
        'src/**',
        'ui_framework/dist/**',
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
        '!src/ui_framework/doc_site/**',
      ],
      dest: 'build/kibana',
      expand: true
    },
  };
};
