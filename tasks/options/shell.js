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
    }
  }
};