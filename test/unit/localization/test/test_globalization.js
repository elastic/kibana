/*
 These are the test cases for Kibana Globalisation.

 The code prior to testing performs the following inventory:
  - It finds all localiztion directories ('i1n8') in the code base
  - Finds all locales by checking for JSON files in the localization directories

 Testing covers:
  - Missing locale translation files in a localization directory
  - Missing translation identifiers in locale translation files
  - Missing translations in a locale translation file
  - TBD: Check the translation identifiers in locale file against code files for
  - that localization directory to check for stray or stale identifiers.
 The tests assume the english locale (en) in a localization directory is the
 reference file for checking.
*/

import expect from 'expect.js';

var fs = require('fs');
var path = require('path');

function getFiles(localeDir) {
  var fileList = [];

  var files = fs.readdirSync(localeDir);
  for (var i in files) {
    if (!files.hasOwnProperty(i)) continue;
    var name = localeDir + '/' + files[i];
    if (!fs.statSync(name).isDirectory()) {
      fileList.push(name);
    }
  }
  return fileList;
}

function walkSync(currentDirPath, locDirName, callback) {
  fs.readdirSync(currentDirPath).forEach(function (name) {
    var filePath = path.join(currentDirPath, name);
    var stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (filePath.endsWith(locDirName)) {
        callback(filePath);
      }
      walkSync(filePath, locDirName, callback);
    }
  });
}

function checkLocaleExist(expectedLocale, localeFiles, localeDir) {
  var localeFileName = expectedLocale + '.json';
  var localeFullFilePath = localeDir + '/' + localeFileName;
  if (localeFiles.indexOf(localeFullFilePath) !== -1) {
    return true;
  }
  return false;
}

function getFileName(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

function checkStrIds(baseFile, fileToCompare) {
  var baseJson = require(baseFile);
  var compareJson = require(fileToCompare);

  if (baseFile === fileToCompare) {
    return true;
  }

  for (var id in baseJson) {
    if (!(baseJson.hasOwnProperty(id))) {
      continue;
    }
    for (var strId in baseJson[id]) {
      if (!(strId in compareJson[id])) {
        return false;
      }
    }
  }
  return true;
}

function checkTranslations(baseFile, fileToCompare) {
  var baseJson = require(baseFile);
  var compareJson = require(fileToCompare);

  if (baseFile === fileToCompare) {
    return true;
  }

  for (var id in baseJson) {
    if (!(baseJson.hasOwnProperty(id))) {
      continue;
    }
    for (var strId in baseJson[id]) {
      if (baseJson[id][strId] === compareJson[id][strId]) {
        return false;
      }
    }
  }
  return true;
}

var topDir = __dirname + '/../../../..';
var locDirName = '/i18n';
var fileToCompareWith = 'en.json';
var languageList = [];
var locPaths = [];

walkSync(topDir, locDirName, function (filePath) {
  var files = getFiles(filePath);
  var arrayLength = files.length;
  for (var i = 0; i < arrayLength; i++) {
    var file = files[i];
    var fileName = getFileName(file);
    var lang  = fileName.substr(0, fileName.lastIndexOf('.'));
    if (languageList.indexOf(lang) !== -1) {
      continue;
    }
    languageList.push(lang);
  }
  if (locPaths.indexOf(filePath) === -1) {
    locPaths.push(filePath);
  }
});

describe('Locale file exists', function () {
  function testLocaleFiles(currLocale, localeFiles, currentDir) {
    it('for ' + currLocale + ' in ' + currentDir, function () {
      var result = checkLocaleExist(currLocale, localeFiles, currentDir);
      expect(result).to.be(true);
    });
  }

  var locDirLength = locPaths.length;
  for (var path = 0; path < locDirLength; path++) {
    var localeDir = locPaths[path];
    var localeFiles = getFiles(localeDir);
    var localeLength = languageList.length;
    for (var i = 0; i < localeLength; i++) {
      var locale = languageList[i];
      testLocaleFiles(locale, localeFiles, localeDir);
    }
  }
});

describe('Translation identifiers exist for locale file', function () {
  function testLocaleIds(localeFile, currentDir) {
    it(localeFile, function () {
      var result = checkStrIds(currentDir + '/' + fileToCompareWith, localeFile);
      expect(result).to.be(true);
    });
  }

  var locDirLength = locPaths.length;
  for (var path = 0; path < locDirLength; path++) {
    var localeDir = locPaths[path];
    var localeFiles = getFiles(localeDir);
    var arrayLength = localeFiles.length;
    for (var i = 0; i < arrayLength; i++) {
      var localeFile = localeFiles[i];
      testLocaleIds(localeFile, localeDir);
    }
  }
});

describe('Strings translated for locale file', function () {
  function testLocaleStrings(localeFile, currentDir) {
    it(localeFile, function () {
      var result = checkTranslations(currentDir + '/' + fileToCompareWith, localeFile);
      expect(result).to.be(true);
    });
  }

  var locDirLength = locPaths.length;
  for (var path = 0; path < locDirLength; path++) {
    var localeDir = locPaths[path];
    var localeFiles = getFiles(localeDir);
    var arrayLength = localeFiles.length;
    for (var i = 0; i < arrayLength; i++) {
      var localeFile = localeFiles[i];
      testLocaleStrings(localeFile, localeDir);
    }
  }
});
