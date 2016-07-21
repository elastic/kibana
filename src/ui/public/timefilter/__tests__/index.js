var modules = require('ui/modules');

modules.get('kibana').config(function ($provide) {
  $provide.decorator('timefilter', function ($delegate) {
    $delegate.consumeDefaults();
    return $delegate;
  });
});
