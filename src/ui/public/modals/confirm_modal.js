import angular from 'angular';
import { noop } from 'lodash';
import uiModules from 'ui/modules';
import template from './confirm_modal.html';
import { ModalOverlay } from './modal_overlay';

const module = uiModules.get('kibana');

export const ConfirmationButtonTypes = {
  CONFIRM: 'Confirm',
  CANCEL: 'Cancel'
};

/**
 * @typedef {Object} ConfirmModalOptions
 * @property {String} confirmButtonText
 * @property {String=} cancelButtonText
 * @property {function} onConfirm
 * @property {function=} onCancel
 * @property {String=} title - If given, shows a title on the confirm modal. A title must be given if
 * showClose is true, for aesthetic reasons.
 * @property {Boolean=} showClose - If true, shows an [x] icon close button which by default is a noop
 * @property {function=} onClose - Custom close button to call if showClose is true. If not supplied
 * but showClose is true, the function defaults to onCancel.
 */

module.factory('confirmModal', function ($rootScope, $compile) {
  let modalPopover;
  const confirmQueue = [];

  /**
   * @param {String} message - the message to show in the body of the confirmation dialog.
   * @param {ConfirmModalOptions} - Options to further customize the dialog.
   */
  return function confirmModal(message, customOptions) {
    const defaultOptions = {
      onCancel: noop,
      cancelButtonText: 'Cancel',
      showClose: false,
      defaultFocusedButton: ConfirmationButtonTypes.CONFIRM
    };

    if (customOptions.showClose === true && !customOptions.title) {
      throw new Error('A title must be supplied when a close icon is shown');
    }

    if (!customOptions.confirmButtonText || !customOptions.onConfirm) {
      throw new Error('Please specify confirmation button text and onConfirm action');
    }

    const options = Object.assign(defaultOptions, customOptions);

    // Special handling for onClose - if no specific callback was supplied, default to the
    // onCancel callback.
    options.onClose = customOptions.onClose || options.onCancel;

    const confirmScope = $rootScope.$new();

    confirmScope.message = message;
    confirmScope.confirmButtonText = options.confirmButtonText;
    confirmScope.cancelButtonText = options.cancelButtonText;
    confirmScope.title = options.title;
    confirmScope.showClose = options.showClose;
    confirmScope.onConfirm = () => {
      destroy();
      options.onConfirm();
    };
    confirmScope.onCancel = () => {
      destroy();
      options.onCancel();
    };
    confirmScope.onClose = () => {
      destroy();
      options.onClose();
    };

    function showModal(confirmScope) {
      const modalInstance = $compile(template)(confirmScope);
      modalPopover = new ModalOverlay(modalInstance);
      angular.element(document.body).on('keydown', (event) => {
        if (event.keyCode === 27) {
          confirmScope.onCancel();
        }
      });

      switch (options.defaultFocusedButton) {
        case ConfirmationButtonTypes.CONFIRM:
          modalInstance.find('[data-test-subj=confirmModalConfirmButton]').focus();
          break;
        case ConfirmationButtonTypes.CANCEL:
          modalInstance.find('[data-test-subj=confirmModalCancelButton]').focus();
          break;
        default:
      }
    }

    if (modalPopover) {
      confirmQueue.unshift(confirmScope);
    } else {
      showModal(confirmScope);
    }

    function destroy() {
      modalPopover.destroy();
      modalPopover = undefined;
      angular.element(document.body).off('keydown');
      confirmScope.$destroy();

      if (confirmQueue.length > 0) {
        showModal(confirmQueue.pop());
      }
    }
  };
});
