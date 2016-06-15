define(function (require) {
  require('angular');
  require('node_modules/@spalger/angular-bootstrap/ui-bootstrap-tpls');

  return require('ui/modules')
  .get('kibana', ['ui.bootstrap', 'pascalprecht.translate'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  })
  .config(function ($translateProvider, $translatePartialLoaderProvider) {
  $translateProvider.useLoader('$translatePartialLoader', {
    urlTemplate: '{part}/i18n/{lang}.json'
  });
  $translateProvider
    .uniformLanguageTag('bcp47')
    .determinePreferredLanguage()
    .fallbackLanguage('en');
});


});
