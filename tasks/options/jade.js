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



var glob = require('glob');
module.exports = function (grunt) {
  var tests = glob.sync('./test/unit/**/*.js').map(function (file) {
    return file.replace(/^\./,'');
  });
  return {
    test: {
      options: {
        data: {
          tests: JSON.stringify(tests),
          host: '<%= kibanaHost %>'
        },
        client: false
      },
      files: {
        './test/index.html': './test/templates/index.jade'
      }
    }
  };
};
