module.exports = function (config) {
  return {
    kibana: {
      options: {
        repository: 'git://github.com/elasticsearch/kibana.git',
        directory: '<%= kibanaCheckoutDir %>'
      }
    }
  };
};