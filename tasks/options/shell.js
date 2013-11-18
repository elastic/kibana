module.exports = function (config) {
  return {
    maven_clean: {
      command: 'mvn clean',
      cwd: '<%= shipperDir %>',
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= shipperDir %>',
        }
      },
    },
    maven_package: {
      command: 'mvn package',
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= shipperDir %>',
        }
      },
    },
    build_kibana: {
      command: [ 'npm install', 'grunt build'].join("&&"),
      options: {
        stdout: true,
        failOnError: true,
        execOptions: {
          cwd: '<%= buildMergeDir %>',
        }
      }
    }
  }
};