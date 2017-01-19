import uiModules from 'ui/modules';
import 'ui/modals';

const module = uiModules.get('kibana');

module.factory('safeConfirm', function ($timeout, Promise, confirmModal) {
  return (message, confirmButtonText = 'Okay', cancelButtonText = 'Cancel') => new Promise((resolve, reject) => {
    confirmModal(message, resolve, reject, confirmButtonText, cancelButtonText);
  });
});
