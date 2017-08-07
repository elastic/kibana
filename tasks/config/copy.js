module.exports = function () {
  return {
    devSource: {
      options: { mode: true },
      src: [
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
        'bin/**',
        'ui_framework/components/**',
        'ui_framework/services/**',
        'ui_framework/dist/**',
        'webpackShims/**'
      ],
      dest: 'build/kibana',
      expand: true
    },
    config: {
      src: ['config/kibana.yml'],
      dest: 'build/kibana/config/kibana.yml',
      options: {
        mode: true,
        process(content) {
          const replacements = {
            'logging.dest': '/var/log/kibana/kibana.log',
            'pid.file': '/var/run/kibana/kibana.pid'
          };

          Object.keys(replacements).forEach(key => {
            const match = new RegExp(`^#${key}.*$`, 'm');
            content = content.replace(match, `${key}: ${replacements[key]}`);
          });
          return content;
        }
      }
    }
  };
};
