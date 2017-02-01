define(function (require) {
  require('angular');
  require('ui/angular-bootstrap/index');
  const chrome = require('../src/ui/public/chrome/chrome');

  return require('ui/modules')
  .get('kibana', ['ui.bootstrap', 'pascalprecht.translate'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  })
  .factory('translationsLoader', function ($q) {
      return function (options) {
        var deferred = $q.defer();
        const translations = chrome.getTranslations();
        deferred.resolve(translations);
        return deferred.promise;
      };
  })
  .config(['$translateProvider', function ($translateProvider) {
    $translateProvider.preferredLanguage('en');
    $translateProvider.useLoader('translationsLoader');
    // Enable escaping of HTML
    // issue in https://angular-translate.github.io/docs/#/guide/19_security
    $translateProvider.useSanitizeValueStrategy('escape');
  }]);

});
