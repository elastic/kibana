const I18n =  class {
  constructor(translations) {
    this.translations = translations;
  }

  translate(key) {
    if (!(key in this.translations)) {
      return null;
    }
    return this.translations[key];
  }
};

const getLocaleTranslations = async function (acceptLanguages, defaultLocale, server) {
  const locale = getTranslationLocale(acceptLanguages, defaultLocale, server);
  const translations = await server.plugins.i18n.getRegisteredLocaleTranslations(locale);
  return translations;
};

function getTranslationLocale(acceptLanguages, defaultLocale, server) {
  let localeStr = '';

  if (acceptLanguages === null || acceptLanguages.length <= 0) {
    return defaultLocale;
  }
  const registeredLocales = server.plugins.i18n.getRegisteredTranslationLocales();
  localeStr = getTranslationLocaleExactMatch(acceptLanguages, registeredLocales);
  if (localeStr != null) {
    return localeStr;
  }
  localeStr = getTranslationLocaleBestCaseMatch(acceptLanguages, registeredLocales, defaultLocale);
  return localeStr;
}

function getTranslationLocaleExactMatch(acceptLanguages, registeredLocales) {
  let localeStr = '';

  const acceptLangsLen = acceptLanguages.length;
  for (let indx = 0; indx < acceptLangsLen; indx++) {
    const language = acceptLanguages[indx];
    if (language.region) {
      localeStr = language.code + '-' + language.region;
    } else {
      localeStr = language.code;
    }
    if (registeredLocales.indexOf(localeStr) > -1) {
      return localeStr;
    }
  }
  return null;
}

function getTranslationLocaleBestCaseMatch(acceptLanguages, registeredLocales, defaultLocale) {
  let localeStr = '';

  const acceptLangsLen = acceptLanguages.length;
  const regLangsLen = registeredLocales.length;
  for (let indx = 0; indx < acceptLangsLen; indx++) {
    const language = acceptLanguages[indx];
    localeStr = language.code;
    for (let regIndx = 0; regIndx < regLangsLen; regIndx++) {
      const locale = registeredLocales[regIndx];
      if (locale.match('^' + locale)) {
        return locale;
      }
    }
  }
  return defaultLocale;
}

/**
 * Return translations for a locale.
 * The locale is decided by checking the user side locales against locale translations.
 * If no exact or partial match is found then the default locale is used.
 * @param {string} acceptLanguages - List of accept languages/locales from user side
 * @param {string} defaultLocale - Default locale as configured in Kibana
 * @param {object} server - Hapi server instance
 * @return {object} - A JSON object of translations
 */
module.exports.getLocaleTranslations = getLocaleTranslations;

/**
 * Class which encapsulates translations for a locale and return translations string for a given translation key using translate(key).
 * @param {object} translations - Translations for a locale
 */
module.exports.I18n = I18n;
