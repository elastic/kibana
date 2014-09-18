module.exports = function (grunt) {
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
          src: '<%= root %>/LICENSE.md',
          dest: '<%= build %>/dist/LICENSE.md'
        },
        {
          src: '<%= root %>/README.md',
          dest: '<%= build %>/dist/README.md'
        },
        {
          expand: true,
          cwd: '<%= build %>/kibana/',
          src: '*.jar',
          dest: '<%= build %>/dist/lib/'
        },
        {
          expand: true,
          cwd: '<%= src %>/server/config/',
          src: 'kibana.yml',
          dest: '<%= build %>/dist/config/'
        }
      ]
    }

  };

  return config;
};
