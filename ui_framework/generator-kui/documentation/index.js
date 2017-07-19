const chalk = require('chalk');
const Generator = require('yeoman-generator');
const utils = require('../utils');

const DOCUMENTATION_PAGE_PATH = 'ui_framework/doc_site/src/views';

module.exports = class extends Generator {
  constructor(args, options) {
    super(args, options);

    this.fileType = options.fileType;
  }

  prompting() {
    const prompts = [{
      message: 'What\'s the name of the component you\'re documenting? Use snake_case, please.',
      name: 'name',
      type: 'input',
      store: true,
    }];

    if (this.fileType === 'demo') {
      prompts.push({
        message: 'What would you like to name this demo? Use snake_case, please.',
        name: 'demoName',
        type: 'input',
        store: true,
      });
    }

    return this.prompt(prompts).then(answers => {
      this.config = answers;
    });
  }

  writing() {
    const config = this.config;

    const writeDocumentationPage = () => {
      const componentExampleName = utils.makeComponentName(config.name, false);
      const componentExamplePrefix = utils.lowerCaseFirstLetter(componentExampleName);
      const fileName = config.name;

      const path = DOCUMENTATION_PAGE_PATH;

      const vars = config.documentationVars = {
        componentExampleName,
        componentExamplePrefix,
        fileName,
      };

      const documentationPagePath
        = config.documentationPagePath
        = `${path}/${config.name}/${config.name}_example.js`;

      this.fs.copyTpl(
        this.templatePath('documentation_page.js'),
        this.destinationPath(documentationPagePath),
        vars
      );
    };

    const writeDocumentationPageDemo = () => {
      const fileName = config.demoName || config.name;
      const componentExampleName = utils.makeComponentName(fileName, false);
      const componentExamplePrefix = utils.lowerCaseFirstLetter(componentExampleName);
      const componentName = utils.makeComponentName(config.name);

      const path = DOCUMENTATION_PAGE_PATH;

      const vars = config.demoVars = {
        componentExampleName,
        componentExamplePrefix,
        componentName,
        fileName,
      };

      const documentationPageDemoPath
        = config.documentationPageDemoPath
        = `${path}/${config.name}/${fileName}.js`;

      this.fs.copyTpl(
        this.templatePath('documentation_page_demo.js'),
        this.destinationPath(documentationPageDemoPath),
        vars
      );
    };

    const writeSandbox = () => {
      const fileName = config.name;
      const componentExampleName = utils.makeComponentName(fileName, false);

      const path = DOCUMENTATION_PAGE_PATH;

      const vars = config.sandboxVars = {
        componentExampleName,
        fileName,
      };

      const sandboxPath
        = config.documentationPageDemoPath
        = `${path}/${config.name}/${fileName}`;

      this.fs.copyTpl(
        this.templatePath('documentation_sandbox.html'),
        this.destinationPath(`${sandboxPath}_sandbox.html`)
      );

      this.fs.copyTpl(
        this.templatePath('documentation_sandbox.js'),
        this.destinationPath(`${sandboxPath}_sandbox.js`),
        vars
      );
    };

    switch (this.fileType) {
      case 'documentation':
        writeDocumentationPage();
        writeDocumentationPageDemo();
        break;

      case 'demo':
        writeDocumentationPageDemo();
        break;

      case 'sandbox':
        writeSandbox();
        break;
    }
  }

  end() {
    const showImportDocumentationPageSnippet = () => {
      const {
        componentExampleName,
        fileName,
      } = this.config.demoVars;

      this.log(chalk.white('\n// Import example into routes.js.'));
      this.log(
        `${chalk.magenta('import')} ${componentExampleName}Example\n` +
        `  ${chalk.magenta('from')} ${chalk.cyan(`'../../views/${fileName}/${fileName}_example'`)};`
      );
    };

    const showImportDemoSnippet = () => {
      const {
        componentExampleName,
        componentExamplePrefix,
        fileName,
      } = this.config.demoVars;

      this.log(chalk.white('\n// Import demo into example.'));
      this.log(
        `${chalk.magenta('import')} ${componentExampleName} from ${chalk.cyan(`'./${fileName}'`)};\n` +
        `${chalk.magenta('const')} ${componentExamplePrefix}Source = require(${chalk.cyan(`'!!raw!./${fileName}'`)});\n` +
        `${chalk.magenta('const')} ${componentExamplePrefix}Html = renderToHtml(${componentExampleName});`
      );
    };

    const showImportSandboxSnippet = () => {
      const {
        componentExampleName,
        fileName,
      } = this.config.sandboxVars;

      this.log(chalk.white('\n// Import example into routes.js.'));
      this.log(
        `${chalk.magenta('import')} ${componentExampleName}Sandbox\n` +
        `  ${chalk.magenta('from')} ${chalk.cyan(`'../../views/${fileName}/${fileName}_sandbox'`)};`
      );
    };

    this.log('------------------------------------------------');
    this.log(chalk.bold('Import snippets:'));

    switch (this.fileType) {
      case 'documentation':
        showImportDocumentationPageSnippet();
        break;

      case 'demo':
        showImportDemoSnippet();
        break;

      case 'sandbox':
        showImportSandboxSnippet();
        break;
    }
    this.log('------------------------------------------------');
  }
}
