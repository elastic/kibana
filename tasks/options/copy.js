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



module.exports = function (config) {
  function exclude(src) {
    return !(/(analytics|PhoneHome)/.test(src));
  }

  return {
    artifacts_to_build: {
      files: [
        {
          // LICENSE.txt
          cwd: '.',
          expand: true,
          src: ['LICENSE.txt'],
          dest: '<%= buildDir %>'
        },
        {
          // agent jar
          cwd: '<%= agentDir %>/target',
          expand: true,
          src: ['<%= pkg.name %>-<%= pkg.version %>.jar'],
          dest: '<%= buildDir %>'
        },
        {
          // merged kibana
          cwd: '<%= buildTempDir %>/dist',
          expand: true,
          src: ['**'],
          dest: '<%= buildKibanaDir %>'
        },
        {
          cwd: '.',
          expand: true,
          src: ['index.html', './common/**/*'],
          dest: '<%= buildSiteDir %>',
          filter: exclude 
        }
      ]},
    merge_marvel_kibana: {
      files: [
        {
          expand: true,
          cwd: '<%= kibanaCheckoutDir %>',
          src: [ '**', '.jshintrc', '.git/**'],
          dest: '<%= buildTempDir %>'
        },
        {
          expand: true,
          cwd: 'kibana/dashboards',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/dashboards/marvel'
        },
        {
          expand: true,
          cwd: 'kibana/panels',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/panels/marvel'
        },
        {
          expand: true,
          cwd: 'kibana/services',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/services/marvel'
        },
        {
          expand: true,
          cwd: 'kibana/lib',
          src: '**',
          dest: '<%= buildTempDir %>/src/app/lib'
        },
        {
          src: 'kibana/vendor/react/react.js',
          dest: '<%= buildTempDir %>/src/vendor/marvel/react/react.js'
        },
        {
          expand: true,
          cwd: 'kibana/vendor',
          src: '**',
          dest: '<%= buildTempDir %>/src/vendor/marvel',
          filter: function (src) {
            return !/vendor\/(kibana|react)/.test(src);
          }
        }
      ]
    }
  };
};
