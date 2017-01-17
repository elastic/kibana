import { noop } from 'lodash';
import uiModules from 'ui/modules';
import template from './confirm_modal.html';
import { ModalOverlay } from './modal_overlay';

const module = uiModules.get('kibana');

module.factory('confirmModal', function ($rootScope, $compile) {
  let modalPopover;

  return function confirmModal(message, customOptions = {}) {
    const defaultOptions = {
      onConfirm: noop,
      onCancel: noop,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel'
    };

    const options = Object.assign(defaultOptions, customOptions);
    if (modalPopover) throw new Error('Ah ah ah, only one modal, buddy!');

    const confirmScope = $rootScope.$new();

    confirmScope.message = message;
    confirmScope.confirmButtonText = options.confirmButtonText;
    confirmScope.cancelButtonText = options.cancelButtonText;
    confirmScope.onConfirm = () => {
      destroy();
      options.onConfirm();
    };
    confirmScope.onCancel = () => {
      destroy();
      options.onCancel();
    };

    const modalInstance = $compile(template)(confirmScope);
    modalPopover = new ModalOverlay(modalInstance);

    function destroy() {
      modalPopover.destroy();
      modalPopover = undefined;
      confirmScope.$destroy();
    }
  };
});
