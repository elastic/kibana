import fs from 'fs';
import path from 'path';
import Promise from 'bluebird';
import globProm from 'glob-promise';

const readFile = Promise.promisify(fs.readFile);

/**
 * Verify translation keys in files are translated.
 * @param {Array<string>} filesPatterns - List of file patterns to be checkd for translation keys
 * @param {Object}} translations - Object of translations keys and their translations
 * @param {RegExp} translationPatternRegEx - Pattern of translation method to check for so can get list of translation keys
 * @return {Promise} - A Promise object which will contain an empty Object if all translation keys are translated. If translation keys are
 * not translated then the Object will contain all non translated translation keys with value of file the key is from
 */
export function verifyTranslationKeys(filesPatterns, translations, translationPatternRegEx) {
  return getFilesToVerify(filesPatterns).then(function (filesToVerify) {
    return verifyKeysInFiles(filesToVerify, translationPatternRegEx, translations).then(function (keysNotTranslated) {
      return keysNotTranslated;
    });
  });
};

function getFilesToVerify(verifyFilesPatterns) {
  let filesToVerify = [];

  return Promise.map(verifyFilesPatterns, (verifyFilesPattern) => {
    const baseSearchDir = path.dirname(verifyFilesPattern);
    const pattern = path.basename(verifyFilesPattern);
    return globProm(pattern, {cwd: baseSearchDir, matchBase: true}).then(function (files) {
      for (let file of files) {
        filesToVerify.push(baseSearchDir + '/' + file);
      }
    });
  }).then(function () {
    return filesToVerify;
  });
}

function verifyKeysInFiles(filesToVerify, translationPatternRegEx, translations) {
  let keysNotTranslated = {};

  return Promise.all(filesToVerify, (file) => {
    return readFile(file, 'utf8').then(function (fileContents) {
      let key = [];
      do {
        key = translationPatternRegEx.exec(fileContents);
        if (key && key.length >= 2) {
          if (!translations.hasOwnProperty(key[1])) {
            keysNotTranslated[key[1]] = file;
          }
        }
      } while (key);
    });
  }).then(function () {
    return keysNotTranslated;
  });
}
