define(function (require) {
  require('angular');
  require('node_modules/@spalger/angular-bootstrap/ui-bootstrap-tpls');

  return require('ui/modules')
  .get('kibana', ['ui.bootstrap'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  });

});
