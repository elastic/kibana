import fs from 'fs';
import glob from 'glob';
import path from 'path';
import Promise from 'bluebird';
import _ from 'lodash';

const readFile = Promise.promisify(fs.readFile);
const globProm = Promise.promisify(glob);

/**
 * Return all the translation keys found for the file pattern
 * @param {String} translationPattern - regEx pattern for translations
 * @param {Array<String>} filesPatterns - List of file patterns to be checkd for translation keys
 * @return {Promise} - A Promise object which will return a String Array of the translation keys
 * not translated then the Object will contain all non translated translation keys with value of file the key is from
 */
export function getTranslationKeys(translationPattern, filesPatterns) {
  return getFilesToVerify(filesPatterns)
  .then(function (filesToVerify) {
    return getKeys(translationPattern, filesToVerify);
  });
}

/**
 * Return translation keys that are not translated
 * @param {Array<String>} translationKeys - List of translation keys to be checked if translated
 * @param {Object} localeTranslations - Object of locales and their translations
 * @return {Object} - A object which will be empty if all translation keys are translated. If translation keys are
 * not translated then the Object will contain all non translated translation keys per localem
 */
export function getNonTranslatedKeys(translationKeys, localeTranslations) {
  const keysNotTranslatedPerLocale = {};
  _.forEach(localeTranslations, (translations, locale) => {
    const keysNotTranslated = _.difference(translationKeys, Object.keys(translations));
    if (!_.isEmpty(keysNotTranslated)) {
      keysNotTranslatedPerLocale[locale] = keysNotTranslated;
    }
  });
  return keysNotTranslatedPerLocale;
}

function getFilesToVerify(verifyFilesPatterns) {
  const filesToVerify = [];

  return Promise.map(verifyFilesPatterns, (verifyFilesPattern) => {
    const baseSearchDir = path.dirname(verifyFilesPattern);
    const pattern = path.join('**', path.basename(verifyFilesPattern));
    return globProm(pattern, { cwd: baseSearchDir, matchBase: true })
    .then(function (files) {
      for (const file of files) {
        filesToVerify.push(path.join(baseSearchDir, file));
      }
    });
  })
  .then(function () {
    return filesToVerify;
  });
}

function getKeys(translationPattern, filesToVerify) {
  const translationKeys = [];
  const translationRegEx = new RegExp(translationPattern, 'g');

  const filePromises = _.map(filesToVerify, (file) => {
    return readFile(file, 'utf8')
    .then(function (fileContents) {
      let regexMatch;
      while ((regexMatch = translationRegEx.exec(fileContents)) !== null) {
        if (regexMatch.length >= 2) {
          const translationKey = regexMatch[1];
          translationKeys.push(translationKey);
        }
      }
    });
  });
  return Promise.all(filePromises)
  .then(function () {
    return _.uniq(translationKeys);
  });
}
