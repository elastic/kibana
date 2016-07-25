import uiModules from 'ui/modules';
import template from './kbn_share.html';
import './kbn_share.less';
import KbnShareControllerProvider from './kbn_share_controller';

const module = uiModules.get('kibana/sharing_ui', [
  'kibana/notify'
]);

module.directive('kbnShare', kbnShareDirective);
module.service('kbnShare', kbnShareService);

function kbnShareDirective(Private, kbnShare) {
  const KbnShareController = Private(KbnShareControllerProvider);

  return {
    restrict: 'E',
    transclude: true,
    template,
    controller($scope, $attrs, $element) {
      $scope.kbnShare = new KbnShareController();
      $scope.kbnShare._link($scope, $element);
      return $scope.kbnShare;
    }
  };
}

function kbnShareService($rootScope, Notifier) {
  const notify = new Notifier({
    location: 'Sharing'
  });
  const map = new Map();
  const getItems = () => new Map(map);
  const kbnShare = {
    register,
    getItems,
    onItemsChange
  };

  return kbnShare;

  function register(key, settings) {
    settings.key = key;
    map.set(key, settings);
    raiseItemsChanged();
  }

  function raiseItemsChanged() {
    $rootScope.$emit('kbnShare.items', getItems());
  }

  function onItemsChange(fn) {
    return $rootScope.$on('kbnShare.items', (e, items) => fn(items));
  }
}
