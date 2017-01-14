import uiModules from 'ui/modules';
import 'ui/modals';

const module = uiModules.get('kibana');

module.factory('safeConfirm', function ($timeout, Promise, confirmModal) {
  return (message) => $timeout(() => {
    return new Promise((resolve, reject) => {
      confirmModal(message, resolve, reject, 'Yes', 'No');
    });
  });
});
