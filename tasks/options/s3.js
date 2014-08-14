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



module.exports = function (config, grunt) {
  var upload;

  if (grunt.option('latest')) {
    upload = [
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.zip',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-latest.zip',
      },
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-latest.tar.gz',
      }
    ];
  } else {
    upload = [
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.zip',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-<%= pkg.version %>.zip',
      },
      {
        src: '<%= packageDir %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
        dest: 'elasticsearch/<%= pkg.name %>/<%= pkg.name %>-<%= pkg.version %>.tar.gz',
      }
    ];
  }

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      //debug: true, // uncommment to prevent actual upload
      upload: upload
    }
  };
};