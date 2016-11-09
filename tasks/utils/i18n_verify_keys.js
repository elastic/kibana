import fs from 'fs';
import glob from 'glob';
import path from 'path';
import Promise from 'bluebird';
import _ from 'lodash';

const readFile = Promise.promisify(fs.readFile);
const globProm = Promise.promisify(glob);

/**
 * Verify translation keys in files are translated.
 * @param {Array<String>} filesPatterns - List of file patterns to be checkd for translation keys
 * @param {Object} translations - Object of translations keys and their translations
 * @return {Promise} - A Promise object which will contain an empty Object if all translation keys are translated. If translation keys are
 * not translated then the Object will contain all non translated translation keys with value of file the key is from
 */
export function verifyTranslationKeys(filesPatterns, translations) {
  return getFilesToVerify(filesPatterns)
  .then(function (filesToVerify) {
    return verifyKeysInFiles(filesToVerify, translations)
    .then(function (keysNotTranslated) {
      return keysNotTranslated;
    });
  });
};

function getFilesToVerify(verifyFilesPatterns) {
  let filesToVerify = [];

  return Promise.map(verifyFilesPatterns, (verifyFilesPattern) => {
    const baseSearchDir = path.dirname(verifyFilesPattern);
    const pattern = path.basename(verifyFilesPattern);
    return globProm(pattern, {cwd: baseSearchDir, matchBase: true})
    .then(function (files) {
      for (let file of files) {
        filesToVerify.push(baseSearchDir + '/' + file);
      }
    });
  })
  .then(function () {
    return filesToVerify;
  });
}

function verifyKeysInFiles(filesToVerify, translations) {
  let keysNotTranslated = {};
  const translationPattern = 'i18n\\(\'(.*)\'\\)';
  const translationRegEx = new RegExp(translationPattern, 'g');

  const filePromises = _.map(filesToVerify, (file) => {
    return readFile(file, 'utf8')
    .then(function (fileContents) {
      let regexMatch;
      while (regexMatch = translationRegEx.exec(fileContents) !== null) {
        if (regexMatch.length >= 2) {
          const translationKey = regexMatch[1];
          if (!translations.hasOwnProperty(translationKey)) {
            keysNotTranslated[translationKey] = file;
          }
        }
      }
    });
  });
  return Promise.all(filePromises)
  .then(function () {
    return keysNotTranslated;
  });

}
