module.exports = function (config) {
  return {
    maven_clean: {
      command: 'mvn clean',
      cwd: '<%= exporterDir %>',
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= exporterDir %>',
        }
      },
    },
    maven_package: {
      command: 'mvn package',
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= exporterDir %>',
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