module.exports = function (config) {
  var rewriteRulesSnippet = require('grunt-connect-rewrite/lib/utils').rewriteRequest;
  return {
    options: {
      port: '<%= kibanaPort %>',
      hostname: '<%= kibanaHost %>',
      base: '.',
      keepalive: true,
      middleware: function (connect, options) {
        return [
          rewriteRulesSnippet, // RewriteRules support
          connect.static(require('path').resolve(options.base)) // mount filesystem
        ];
      }
    },
    rules: {
      '^/kibana/app/dashboards/marvel/(.*)$': '/kibana/dashboards/$1',
      '^/kibana/app/panels/marvel/(.*)$': '/kibana/panels/$1',
      '^/kibana/config.js$': '/<%= buildTempDir %>/config.js',
      '^/kibana(.*)$': '<%= kibanaCheckoutDir %>/src$1',
      '^/sense(.*)$': '/sense$1',
      '^/common(.*)$': '/common$1'
    }
  };
};