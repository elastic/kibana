import langParser from 'accept-language-parser';
import _ from 'lodash';

/**
 * Return translations suitable from a user side locale list, substituting any missing
 * translation with the default local translation.
 * @param {String} acceptLanguages - Accept languages/locales from user side
 * @param {Object} server - Hapi server instance
 * @return {Object} - A JSON object of translations
 */
export async function getTranslations(acceptLanguages, server) {
  const languageTags = getLanguageTags(acceptLanguages);
  const translations = await server.plugins.i18n.getTranslationsForLocales(languageTags);
  let fullTranslations = {};
  if (_.isEmpty(translations)) {
    fullTranslations = await server.plugins.i18n.getTranslationsForDefaultLocale(server);
  } else {
    const defaultTranslations = await server.plugins.i18n.getTranslationsForDefaultLocale(server);
    fullTranslations = _.defaults(translations, defaultTranslations);
  }
  return fullTranslations;
};

function getLanguageTags(acceptLanguages) {
  const languageTags = [];

  if (_.isEmpty(acceptLanguages)) return languageTags;

  const languages = langParser.parse(acceptLanguages);
  const languagesLen = languages.length;
  for (let indx = 0; indx < languagesLen; indx++) {
    const language = languages[indx];
    let languageTag = language.code;
    if (!_.isEmpty(language.region)) {
      languageTag = languageTag + '-' + language.region;
    }
    if (!_.isEmpty(language.script)) {
      languageTag = languageTag + '-' + language.script;
    }
    languageTags.push(languageTag);
  }
  return languageTags;
}
