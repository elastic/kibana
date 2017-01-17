import { noop } from 'lodash';
import uiModules from 'ui/modules';
import template from './confirm_modal.html';
import { Popover } from './popover';

const module = uiModules.get('kibana');

module.factory('confirmModal', function ($rootScope, $compile) {
  let modalPopover;

  return function confirmModal(
      message,
      onConfirm = noop,
      onCancel = noop,
      onClose = noop,
      confirmButtonText = 'Confirm',
      cancelButtonText = 'Cancel',
      title) {

    if (modalPopover) throw new Error('Ah ah ah, only one modal, buddy!');

    const confirmScope = $rootScope.$new();

    confirmScope.message = message;
    confirmScope.title = title;
    confirmScope.confirmButtonText = confirmButtonText;
    confirmScope.cancelButtonText = cancelButtonText;
    confirmScope.onConfirm = () => {
      destroy();
      onConfirm();
    };
    confirmScope.onCancel = () => {
      destroy();
      onCancel();
    };
    confirmScope.onClose = () => {
      destroy();
      onClose();
    };

    const modalInstance = $compile(template)(confirmScope);
    modalPopover = new Popover(modalInstance);

    function destroy() {
      modalPopover.destroy();
      modalPopover = undefined;
      confirmScope.$destroy();
    }
  };
});
