module.exports = function(config) {
  return {
    maven_clean: {
      command: 'mvn clean',
      options: {
        stdout: true
      }
    },
    maven_package: {
      command: 'mvn package',
      options: {
        stdout: true
      }
    }
  }
};