module.exports = function(config) {
  return {
    marvel: {
      options: {
        cwd: '.'
      }
    },
    kibana: {
      options: {
        cwd: '<%= kibanaCheckoutDir %>'
      }
    }
  };
};