var bc = require('path').join(__dirname, '../../src/kibana/bower_components');

module.exports = {
  src: {
    src: [
      '<%= src %>/kibana/components/*/*.less',
      '<%= src %>/kibana/apps/dashboard/styles/main.less',
      '<%= src %>/kibana/apps/discover/styles/main.less',
      '<%= src %>/kibana/apps/settings/styles/main.less',
      '<%= src %>/kibana/apps/visualize/styles/main.less',
      '<%= src %>/kibana/apps/visualize/styles/visualization.less',
      '<%= src %>/kibana/apps/visualize/styles/main.less',
      '<%= src %>/kibana/styles/main.less',
      '<%= src %>/kibana/components/vislib/styles/main.less',
      '<%= src %>/kibana/components/**/*.less'
    ],
    expand: true,
    ext: '.css',
    options: {
      ieCompat: false,
      paths: [bc + '/lesshat/build/']
    }
  }
};
