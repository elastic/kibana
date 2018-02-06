module.exports = function () {
  return {
    devSource: {
      options: { mode: true },
      src: [
        'yarn.lock',
        'src/**',
        '!src/**/__tests__/**',
        '!src/test_utils/**',
        '!src/fixtures/**',
        '!src/core_plugins/dev_mode/**',
        '!src/core_plugins/tests_bundle/**',
        '!src/core_plugins/console/public/tests/**',
        '!src/cli/cluster/**',
        '!src/ui_framework/doc_site/**',
        '!src/es_archiver/**',
        '!src/functional_test_runner/**',
        '!src/dev/**',
        'bin/**',
        'ui_framework/components/**',
        'ui_framework/services/**',
        'ui_framework/dist/**',
        'ui_framework/src/**',
        'webpackShims/**',
        'config/kibana.yml',
      ],
      dest: 'build/kibana',
      expand: true
    },
  };
};
