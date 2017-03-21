define(function (require) {
  require('angular');
  require('ui/angular-bootstrap/index');
  const chrome = require('../src/ui/public/chrome/chrome');

  return require('ui/modules')
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

});
