module.exports = function (config) {
  return {
    exporter_build: {
      cwd: '<%= exporterDir %>/target',
      expand: true,
      src: ['<%= pkg.name %>-<%= pkg.version %>.jar'],
      dest: '<%= buildDir %>'
    },
    kibana_build: {
      cwd: '<%= buildTempDir %>/dist',
      expand: true,
      src: ['**'],
      dest: '<%= buildSiteDir %>'
    },
    merge_kibana: {
      expand: true,
      cwd: '<%= kibanaCheckoutDir %>',
      src: [ '**', '.jshintrc'],
      dest: '<%= buildTempDir %>'
    },
    merge_marvel: {
      files: [
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