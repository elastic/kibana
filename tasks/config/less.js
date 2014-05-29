module.exports = {
  src: {
    src: [
      '<%= src %>/kibana/apps/dashboard/styles/main.less',
      '<%= src %>/kibana/apps/discover/styles/main.less',
      '<%= src %>/kibana/apps/settings/styles/main.less',
      '<%= src %>/kibana/apps/visualize/styles/main.less',
      '<%= src %>/kibana/apps/visualize/styles/visualization.less',
      '<%= src %>/kibana/styles/main.less'
    ],
    expand: true,
    ext: '.css',
    options: {
      ieCompat: false
    }
  }
};