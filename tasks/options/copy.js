module.exports = function (config) {
  return {
    artifacts_to_build: {
      files: [
        {
          // agent jar
          cwd: '<%= exporterDir %>/target',
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
          src: ['index.html', 'common'],
          dest: '<%= buildSiteDir %>'
        }
      ]},
    merge_marvel_kibana: {
      files: [
        {
          expand: true,
          cwd: '<%= kibanaCheckoutDir %>',
          src: [ '**', '.jshintrc'],
          dest: '<%= buildTempDir %>'
        },
        {
          expand: true,
          cwd: 'dashboards',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/dashboards/marvel'
        },
        {
          expand: true,
          cwd: 'panels',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/panels/marvel'
        }
      ]
    }
  };
};