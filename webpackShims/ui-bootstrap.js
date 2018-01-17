require('angular');
require('ui/angular-bootstrap');
var uiModules = require('ui/modules').uiModules;

var kibana = uiModules.get('kibana', ['ui.bootstrap']);

module.exports = kibana.config(function ($tooltipProvider) {
  $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
});
