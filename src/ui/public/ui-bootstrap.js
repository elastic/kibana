require('ui/angular');
require('ui/angular-bootstrap');

const { uiModules } = require('ui/modules');
const chrome = require('ui/chrome');

module.exports = uiModules
  .get('kibana', ['ui.bootstrap', 'pascalprecht.translate'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  })
  .config(function ($translateProvider) {
    $translateProvider.translations('default', chrome.getTranslations());
    $translateProvider.preferredLanguage('default');
    // Enable escaping of HTML
    // issue in https://angular-translate.github.io/docs/#/guide/19_security
    $translateProvider.useSanitizeValueStrategy('escape');
  });
