import modules from 'ui/modules';

modules.get('kibana').config(function ($provide) {
  $provide.decorator('timefilter', function ($delegate) {
    $delegate.init();
    return $delegate;
  });
});
