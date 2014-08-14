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



/* jshint node:true */
'use strict';
module.exports = function (grunt) {
  return {
    build_sense: {
      options: {
        appDir: '<%= senseDir %>',
        dir: '<%= buildSenseDir %>',

        modules: [
          {
            name: 'app',
            exclude: [
              'ace'
            ],
            excludeShallow: [
              'welcome_popup'
            ]
          }
        ],

        mainConfigFile: '<%= senseDir %>/app/require.config.js',
        paths: {
          'analytics': __dirname+'/../../build/tmp/common/analytics',
        },
        optimize: 'uglify2',
        optimizeAllPluginResources: true,
        preserveLicenseComments: true,
        generateSourceMaps: false,

        uglify2: {
          max_line_len: 100
        },

        removeCombined: true,
        findNestedDependencies: true,
        normalizeDirDefines: 'all',
        inlineText: true,
        skipPragmas: true,

        done: function (done, output) {
          var duplicates = require('rjs-build-analysis').duplicates(output);

          if (duplicates.length > 0) {
            grunt.log.subhead('Duplicates found in requirejs build:');
            grunt.log.warn(duplicates);
            done(new Error('r.js built duplicate modules, please check the excludes option.'));
          }

          done();
        }
      }
    }
  };
};