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
        /**
          Inject the Kibana config, settings and lodash so that the shared
          analytics.js file will function properly. Since the build enviroment
          doesn't match the runtime enviroment because of how everything is patched
          together we need to do this injection to get things to build properly.
        **/
        paths: {
          'config': __dirname+'/../../build/tmp/src/config',
          'settings': __dirname+'/../../build/tmp/src/app/components/settings',
          'lodash': __dirname+'/../../build/tmp/src/vendor/lodash'
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