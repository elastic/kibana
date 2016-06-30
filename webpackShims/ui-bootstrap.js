define(function (require) {
  require('angular');
  require('../src/ui/public/angular-bootstrap/ui-bootstrap-tpls');

  return require('ui/modules')
  .get('kibana', ['ui.bootstrap'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  });

});
