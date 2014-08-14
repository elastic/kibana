/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



var _ = require('lodash');
module.exports = function (config) {
  var rewriteRulesSnippet = require('grunt-connect-rewrite/lib/utils').rewriteRequest;

  var middleware = function (connect, options) {
    return [
      rewriteRulesSnippet, // RewriteRules support
      connect.static(require('path').resolve(options.base)) // mount filesystem
    ];
  };

  var testBase = '.';
 
  return {
    rules: {
      '^/kibana/app/dashboards/marvel/(.*)$': './kibana/dashboards/$1',
      '^/kibana/app/panels/marvel/(.*)$': './kibana/panels/$1',
      '^/kibana/app/services/marvel/(.*)$': '/kibana/services/$1',
      '^/kibana/app/lib/(.*)$': '/kibana/lib/$1',
      '^/kibana/vendor/marvel/(.*)$': '/kibana/vendor/$1',
      '^/kibana/config.js$': './<%= buildTempDir %>/config.js',
      '^/kibana(.*)$': '<%= kibanaCheckoutDir %>/src$1',
      '^/common/analytics.js$': '/<%= buildTempDir %>/common/analytics.js',
      '^/common/PhoneHome.js$': '/<%= buildTempDir %>/common/PhoneHome.js',
      '^/sense(.*)$': '/sense$1',
      '^/common(.*)$': '/common$1',
      '^/test/panels(.*)$': '/kibana/panels$1',
      '^/test/app(.*)$': '<%= kibanaCheckoutDir %>/src/app$1',
      '^/test/vendor(.*)$': '<%= kibanaCheckoutDir %>/src/vendor$1',
    },
    server: {
      options: {
        port: '<%= kibanaPort %>',
        hostname: '<%= kibanaHost %>',
        base: '.',
        keepalive: false,
        middleware: middleware
      }
    },
    test: {
      options: {
        hostname: '<%= kibanaHost %>',
        port: '6767',
        base: testBase,
        keepalive: false,
        middleware: middleware 
      }
    }
  };
};
