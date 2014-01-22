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