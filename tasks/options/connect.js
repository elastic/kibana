module.exports = function(config) {
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
        }
    ,
    rules: {
            '^/app/dashboards/marvel/(.*)$': '/dashboards/$1',
            '^/app/panels/marvel/(.*)$': '/panels/$1',
            '^/config.js$': '/<%= buildMergeDir %>/config.js',
            '^(.*)$': '<%= kibanaCheckoutDir %>/src/$1'
    }
  };
};