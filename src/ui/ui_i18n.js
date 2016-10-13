import _ from 'lodash';

/**
 * Return translations suitable from a user side locale list, substituting any missing
 * translation with the default local translation.
 * @param {string} acceptLanguages - List of accept languages/locales from user side
 * @param {string} defaultLocale - Default locale as configured in Kibana
 * @param {object} server - Hapi server instance
 * @return {object} - A JSON object of translations
 */
const getTranslations = async function (acceptLanguages, defaultLocale, server) {
  const translations = await server.plugins.i18n.getTranslationsForLocales(acceptLanguages, defaultLocale);
  const defaultTranslations = await server.plugins.i18n.getTranslationsForLocale(defaultLocale);
  const fullTranslations = _.defaults(translations, defaultTranslations);
  return fullTranslations;
};

export { getTranslations };
