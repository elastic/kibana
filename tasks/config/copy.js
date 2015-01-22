module.exports = function (grunt) {
  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');
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
          src: '<%= root %>/package.json',
          dest: '<%= build %>/kibana/package.json'
        },
        {
          src: '<%= server %>/app.js',
          dest: '<%= build %>/kibana/app.js'
        },
        {
          src: '<%= server %>/index.js',
          dest: '<%= build %>/kibana/index.js'
        },
        {
          expand: true,
          cwd: '<%= server %>/bin/',
          src: '**',
          dest: '<%= build %>/kibana/bin'
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
        },
        {
          expand: true,
          cwd: '<%= server %>/views/',
          src: '**',
          dest: '<%= build %>/kibana/views'
        }
      ]
    },

    dist: {
      options: { mode: true },
      files: [
        {
          expand: true,
          cwd: '<%= build %>/kibana',
          src: '**',
          dest: '<%= build %>/dist/kibana/src'
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
      files: []
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

  platforms.forEach(function (platform) {
    config.versioned_dist.files.push({
      expand: true,
      cwd: '<%= build %>/dist/kibana',
      src: '**',
      dest: '<%= build %>/dist/kibana-' + version + '-' + platform
    });
    config.versioned_dist.files.push({
      expand: true,
      cwd: '<%= root %>/.node_binaries/' + platform,
      src: '**',
      dest: '<%= build %>/dist/kibana-' + version + '-' + platform + '/node'
    });
  });

  return config;
};
