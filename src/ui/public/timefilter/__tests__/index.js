import { uiModules } from '../../modules';

uiModules.get('kibana').config(function ($provide) {
  $provide.decorator('timefilter', function ($delegate) {
    $delegate.init();
    return $delegate;
  });
});
