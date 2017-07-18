const Generator = require('yeoman-generator');

module.exports = class extends Generator {
  prompting() {
    return this.prompt([{
      message: 'What do you want to create?',
      name: 'fileType',
      type: 'list',
      choices: [{
        name: 'Stateless function',
        value: 'function'
      }, {
        name: 'Component class',
        value: 'component'
      }],
    }]).then(answers => {
      this.config = answers;
    });
  }

  writing() {
    const createFile = () => {
      this.composeWith(
        require.resolve('../file/index.js'),
        {
          fileType: this.config.fileType,
        }
      );
    }

    switch (this.config.fileType) {
      case 'component':
        createFile();
        break;

      case 'function':
        createFile();
        break;
    }
  }
}
