module.exports = function (config) {
  function exclude(src) {
    return !(/(analytics|PhoneHome)/.test(src));
  }

  return {
    artifacts_to_build: {
      files: [
        {
          // agent jar
          cwd: '<%= agentDir %>/target',
          expand: true,
          src: ['<%= pkg.name %>-<%= pkg.version %>.jar'],
          dest: '<%= buildDir %>'
        },
        {
          // merged kibana
          cwd: '<%= buildTempDir %>/dist',
          expand: true,
          src: ['**'],
          dest: '<%= buildKibanaDir %>'
        },
        {
          cwd: '.',
          expand: true,
          src: ['index.html', './common/**/*'],
          dest: '<%= buildSiteDir %>',
          filter: exclude 
        }
      ]},
    merge_marvel_kibana: {
      files: [
        {
          expand: true,
          cwd: '<%= kibanaCheckoutDir %>',
          src: [ '**', '.jshintrc', '.git/**'],
          dest: '<%= buildTempDir %>'
        },
        {
          expand: true,
          cwd: 'kibana/dashboards',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/dashboards/marvel'
        },
        {
          expand: true,
          cwd: 'kibana/panels',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/panels/marvel'
        },
        {
          expand: true,
          cwd: 'kibana/services',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/services/marvel'
        },
        {
          expand: true,
          cwd: 'kibana/lib',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/lib'
        },
        {
          src: 'kibana/vendor/react/react.js',
          dest: '<%= buildTempDir %>/src/vendor/marvel/react/react.js'
        },
        {
          expand: true,
          cwd: 'kibana/vendor',
          src: '**',
          dest: '<%= buildTempDir %>/src/vendor/marvel',
          filter: function (src) {
            return !/vendor\/(kibana|react)/.test(src);
          }
        }
      ]
    }
  };
};
