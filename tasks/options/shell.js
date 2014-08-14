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
  return {
    maven_clean: {
      command: 'mvn clean',
      cwd: '<%= agentDir %>',
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= agentDir %>',
        }
      },
    },
    maven_package: {
      command: 'mvn package',
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= agentDir %>',
        }
      },
    },
    build_kibana: {
      command: [ 'npm install', 'grunt build' ].join("&&"),
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= buildTempDir %>',
        }
      }
    },
    verify_kibana_status: {
      command: [ 'test -z "`git status --porcelain`"', 'git diff-index --quiet <%= kibanaRevision %> --' ].join("&&"),
      options: {
        stdout: true,
        stderr: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= kibanaCheckoutDir %>',
        },
        callback: function (error, stdout, stderr, cb) {
          if (error) {
            require("grunt").fatal("Kibana checkout is dirty or not on the right branch");
          }
          cb();
        }
      }
    },
    clone_kibana: {
      command: [ 'git clone git://github.com/elasticsearch/kibana.git <%= kibanaCheckoutDir %>',
        'cd <%= kibanaCheckoutDir %>',
        'git checkout <%= kibanaRevision %>'
      ].join('&&'),
      options: {
        stdout: true,
        stderr: true,
        failOnError: true,
      }

    }
  }
}
;