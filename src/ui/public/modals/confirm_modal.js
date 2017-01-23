import { noop } from 'lodash';
import uiModules from 'ui/modules';
import template from './confirm_modal.html';
import { ModalOverlay } from './modal_overlay';

const module = uiModules.get('kibana');

/**
 * @typedef {Object} ConfirmModalOptions
 * @property {String} confirmButtonText
 * @property {String=} cancelButtonText
 * @property {function} onConfirm
 * @property {function=} onCancel
 */

module.factory('confirmModal', function ($rootScope, $compile) {
  let modalPopover;

  /**
   * @param {String} message - the message to show in the body of the confirmation dialog.
   * @param {ConfirmModalOptions} - Options to further customize the dialog.
   */
  return function confirmModal(message, customOptions) {
    const defaultOptions = {
      onCancel: noop,
      cancelButtonText: 'Cancel'
    };

    if (!customOptions.confirmButtonText || !customOptions.onConfirm) {
      throw 'Please specify confirmation button text and onConfirm action';
    }

    const options = Object.assign(defaultOptions, customOptions);
    if (modalPopover) {
      throw new Error('You\'ve called confirmModal but there\'s already a modal open. ' +
        'You can only have one modal open at a time.');
    }

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
    modalInstance.find('[data-test-subj=confirmModalConfirmButton]').focus();

    function destroy() {
      modalPopover.destroy();
      modalPopover = undefined;
      confirmScope.$destroy();
    }
  };
});
