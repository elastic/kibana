import _ from 'lodash';
import Handlebars from 'handlebars';
import { createHash } from 'crypto';
import { readFile } from 'fs';
import { resolve } from 'path';

export class AppBootstrap {
  constructor({ templateData, translations }) {
    this.templateData = templateData;
    this.translations = translations;
    this._rawTemplate = undefined;
  }

  async getJsFile() {
    if (!this._rawTemplate) {
      this._rawTemplate = await loadRawTemplate();
    }

    Handlebars.registerHelper('i18n', key => _.get(this.translations, key, ''));
    const template = Handlebars.compile(this._rawTemplate, {
      knownHelpers: { i18n: true },
      knownHelpersOnly: true,
      noEscape: true, // this is a js file, so html escaping isn't appropriate
      strict: true,
    });
    const compiledJsFile = template(this.templateData);
    Handlebars.unregisterHelper('i18n');

    return compiledJsFile;
  }

  async getJsFileHash() {
    const fileContents = await this.getJsFile();
    const hash = createHash('sha1');
    hash.update(fileContents);
    return hash.digest('hex');
  }
}

function loadRawTemplate() {
  const templatePath = resolve(__dirname, 'template.js.hbs');
  return readFileAsync(templatePath);
}

function readFileAsync(filePath) {
  return new Promise((resolve, reject) => {
    readFile(filePath, 'utf8', (err, fileContents) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(fileContents);
    });
  });
}
