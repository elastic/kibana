var fs = require('fs');
var mkdirp = require('mkdirp');
var process = require('child_process');

var TRANSLATION_STORE_PATH = __dirname + '/../../../../data/translations';

var checkReturnedTranslations = function (actualTranslationJson) {
  var language = 'en';
  var expectedTranslationJsonFile = __dirname + '/data/reference/' + language + '.json';
  var expectedTranslationJson = require(expectedTranslationJsonFile);

  return compareTranslations(actualTranslationJson, expectedTranslationJson);
};

var createTestTranslations = function () {
  var translationStorePath = TRANSLATION_STORE_PATH;
  var language = 'en';
  var srcFile = __dirname + '/data/reference/' + language + '.json';
  var destFile = translationStorePath + '/' + language + '.json';

  if (!fs.existsSync(translationStorePath)) {
    mkdirp.sync(translationStorePath);
  }
  console.log('Write file: ' + srcFile + ' to file: ' + destFile);
  fs.writeFileSync(destFile, fs.readFileSync(srcFile));
};

var deleteTestTranslations = function () {
  var translationStorePath = TRANSLATION_STORE_PATH;
  process.execSync('rm -rf ' + translationStorePath);
};

function compareTranslations(actual, expected) {
  var equal = true;

  for (var key in expected) {
    if (!actual.hasOwnProperty(key)) {
      equal = false;
      break;
    }
    if (actual[key] !== expected[key]) {
      equal = false;
      break;
    }
  }

  return equal;
}

module.exports.checkReturnedTranslations = checkReturnedTranslations;
module.exports.createTestTranslations = createTestTranslations;
module.exports.deleteTestTranslations = deleteTestTranslations;
