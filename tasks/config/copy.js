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
          src: '<%= src %>/server/Gemfile',
          dest: '<%= build %>/kibana/Gemfile'
        },
        {
          src: '<%= src %>/server/Gemfile.lock',
          dest: '<%= build %>/kibana/Gemfile.lock'
        },
        {
          src: '<%= src %>/server/bin/initialize',
          dest: '<%= build %>/kibana/bin/initialize'
        },
        {
          expand: true,
          cwd: '<%= src %>/server/config/',
          src: '**',
          dest: '<%= build %>/kibana/config'
        },
        {
          expand: true,
          cwd: '<%= src %>/server/lib/',
          src: '**',
          dest: '<%= build %>/kibana/lib'
        },
        {
          expand: true,
          cwd: '<%= src %>/server/routes/',
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
          cwd: '<%= src %>/server/config/',
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
    }

  };

  return config;
};
