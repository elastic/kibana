require('angular');
require('ui/angular-bootstrap');
var uiModules = require('ui/modules').uiModules;
var chrome = require('../src/ui/public/chrome/chrome');

var kibana = uiModules.get('kibana', ['ui.bootstrap', 'pascalprecht.translate']);

module.exports = kibana.config(function ($tooltipProvider) {
  $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
})
.config(function ($translateProvider) {
  $translateProvider.translations('default', chrome.getTranslations());
  $translateProvider.preferredLanguage('default');
  // Enable escaping of HTML
  // issue in https://angular-translate.github.io/docs/#/guide/19_security
  $translateProvider.useSanitizeValueStrategy('escape');
});
