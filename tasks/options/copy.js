module.exports = function (config) {
  return {
    plugin_to_marvel: {
      cwd: '<%= exporterDir %>/target',
      expand: true,
      src: ['<%= pkg.name %>-<%= pkg.version %>.jar'],
      dest: '<%= buildDir %>'
    },
    merge_kibana: {
      expand: true,
      cwd: '<%= kibanaCheckoutDir %>',
      src: [ '**', '.jshintrc'],
      dest: '<%= buildMergeDir %>'
    },
    merge_marvel: {
      files: [
        {
          expand: true,
          cwd: 'dashboards',
          src: '**',
          dest: '<%= buildMergeDir %>/src/app/dashboards/marvel'
        },
        {
          expand: true,
          cwd: 'panels',
          src: '**',
          dest: '<%= buildMergeDir %>/src/app/panels/marvel'
        }
      ]
    }
  };
};