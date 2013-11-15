module.exports = function(config) {
  return {
    explicit: {
      files: [
      {
        src: 'panels',
        dest: '<%= baseDir %>/src/app/panels/marvel'
      },
      {
        src: 'dashboards',
        dest: '<%= baseDir %>/src/app/dashboards/marvel'
      },
      {
        src: 'dashboards/overview.json',
        dest: '<%= baseDir %>/src/app/dashboards/default.json'
      }
      ]
    }
  };
};