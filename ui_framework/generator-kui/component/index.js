const chalk = require('chalk');
const Generator = require('yeoman-generator');
const utils = require('../utils');

module.exports = class extends Generator {
  constructor(args, options) {
    super(args, options);

    this.fileType = options.fileType;
  }

  prompting() {
    return this.prompt([{
      message: 'What\'s the name of this file? Use snake_case, please.',
      name: 'name',
      type: 'input',
    }, {
      message: 'Where should it go?',
      type: 'input',
      name: 'path',
      store: true,
    }, {
      message: 'Does it need its own directory?',
      name: 'shouldMakeDirectory',
      type: 'confirm',
      default: true,
    }]).then(answers => {
      this.config = answers;
    });
  }

  writing() {
    const config = this.config;

    // Clean and format input.
    config.path = utils.makePathRelative(config.path);

    const writeComponent = isStatelessFunction => {
      const componentName = utils.makeComponentName(config.name);
      const cssClassName = utils.lowerCaseFirstLetter(componentName);
      const fileName = config.name;

      const path = utils.addDirectoryToPath(
        config.path, fileName, config.shouldMakeDirectory);

      const vars = config.vars = {
        componentName,
        cssClassName,
        fileName,
      };

      const componentPath = config.componentPath = `${path}/${fileName}.js`;
      const testPath = config.testPath = `${path}/${fileName}.test.js`;
      const stylesPath = config.stylesPath = `${path}/_${fileName}.scss`;
      config.stylesImportPath = `./_${fileName}.scss`;

      // Create component file.
      this.fs.copyTpl(
        isStatelessFunction ?
          this.templatePath('stateless_function.js') :
          this.templatePath('component.js'),
        this.destinationPath(componentPath),
        vars
      );

      // Create component test file.
      this.fs.copyTpl(
        this.templatePath('component.test.js'),
        this.destinationPath(testPath),
        vars
      );

      // Create component styles file.
      this.fs.copyTpl(
        this.templatePath('_component.scss'),
        this.destinationPath(stylesPath),
        vars
      );
    }

    switch (this.fileType) {
      case 'component':
        writeComponent();
        break;

      case 'function':
        writeComponent(true);
        break;
    }
  }

  end() {
    const showImportComponentSnippet = () => {
      const componentName = this.config.vars.componentName;
      const componentPath = this.config.componentPath;

      this.log(chalk.gray('// Export component.'));
      this.log(
        `${chalk.magenta('export')} {\n` +
        `  ${componentName},\n` +
        `} ${chalk.magenta('from')} ${chalk.cyan(`'./${this.config.name}'`)};`
      );

      this.log(chalk.gray('\n// Import component.'));
      this.log(
        `${chalk.magenta('import')} {\n` +
        `  ${componentName},\n` +
        `} ${chalk.magenta('from')} ${chalk.cyan(`'./${this.config.name}'`)};`
      );

      const stylesPath = this.config.stylesImportPath;
      this.log(chalk.gray('\n// Import styles.'));
      this.log(chalk.magenta('@import') + ' ' + chalk.cyan('\'' + stylesPath + '\'') + ';');
    }

    this.log('------------------------------------------------');
    this.log(chalk.bold('Import snippets:'));
    switch (this.fileType) {
      case 'component':
        showImportComponentSnippet();
        break;

      case 'function':
        showImportComponentSnippet();
        break;
    }
    this.log('------------------------------------------------');
  }
}
