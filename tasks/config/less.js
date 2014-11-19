var bc = require('path').join(__dirname, '../../src/kibana/bower_components');

module.exports = {
  src: {
    src: [
      '<%= src %>/kibana/components/*/*.less',
      '<%= src %>/kibana/styles/main.less',
      '<%= src %>/kibana/components/vislib/styles/main.less',
      '<%= plugins %>/dashboard/styles/main.less',
      '<%= plugins %>/discover/styles/main.less',
      '<%= plugins %>/settings/styles/main.less',
      '<%= plugins %>/visualize/styles/main.less',
      '<%= plugins %>/visualize/styles/visualization.less',
      '<%= plugins %>/visualize/styles/main.less',
      '<%= plugins %>/table_vis/table_vis.less',
      '<%= plugins %>/metric_vis/metric_vis.less'
    ],
    expand: true,
    ext: '.css',
    options: {
      ieCompat: false,
      paths: [bc + '/lesshat/build/']
    }
  }
};
