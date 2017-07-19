import { uiModules } from 'ui/modules';

uiModules.get('kibana').config(function ($provide) {
  $provide.decorator('timefilter', function ($delegate) {
    $delegate.init();
    return $delegate;
  });
});
