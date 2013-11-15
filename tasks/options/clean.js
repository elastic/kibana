module.exports = function(config) {
  return {
    setup: ['<%= destDir %>','<%= baseDir %>','<%= buildDir %>'],
    default_dashboard: ['<%= srcDir %>/app/dashboards/default.json'],
    dist: ['<%= destDir %>']
  };
};