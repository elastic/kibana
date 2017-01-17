import uiModules from 'ui/modules';
import 'ui/modals';

const module = uiModules.get('kibana');

module.factory('safeConfirm', function ($timeout, Promise, confirmModal) {
  return (message) => new Promise((resolve, reject) => {
    const confirmOptions = {
      onConfirm: resolve,
      onCancel: reject,
      confirmButtonText: 'Okay',
      cancelButtonText: 'Cancel'
    };
    confirmModal(message, confirmOptions);
  });
});
