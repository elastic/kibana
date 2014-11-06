module.exports = function (grunt) {
  var version = grunt.config.get('pkg.version');
  var config = {

    kibana_src: {
      expand: true,
      cwd: '<%= app %>',
      src: '**',
      dest: '<%= build %>/src/'
    },

    server_src: {
      files: [
        {
          src: '<%= server %>/Gemfile',
          dest: '<%= build %>/kibana/Gemfile'
        },
        {
          src: '<%= server %>/Gemfile.lock',
          dest: '<%= build %>/kibana/Gemfile.lock'
        },
        {
          src: '<%= server %>/bin/initialize',
          dest: '<%= build %>/kibana/bin/initialize'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: '**',
          dest: '<%= build %>/kibana/config'
        },
        {
          expand: true,
          cwd: '<%= server %>/lib/',
          src: '**',
          dest: '<%= build %>/kibana/lib'
        },
        {
          expand: true,
          cwd: '<%= server %>/routes/',
          src: '**',
          dest: '<%= build %>/kibana/routes'
        }
      ]
    },

    dist: {
      options: { mode: true },
      files: [
        {
          expand: true,
          cwd: '<%= build %>/kibana/',
          src: '*.jar',
          dest: '<%= build %>/dist/kibana/lib/'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: 'kibana.yml',
          dest: '<%= build %>/dist/kibana/config/'
        }
      ]
    },

    versioned_dist: {
      options: { mode: true },
      files: [
        {
          expand: true,
          cwd: '<%= build %>/dist/kibana',
          src: '**',
          dest: '<%= build %>/dist/kibana-' + version
        }
      ]
    },

    plugin_readme: {
      files: [
        {
          src: '<%= build %>/kibana/public/plugins/README.txt',
          dest: '<%= build %>/dist/kibana/plugins/README.txt'
        }
      ]
    }

  };

  return config;
};
