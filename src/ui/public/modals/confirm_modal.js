import angular from 'angular';
import { noop } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './confirm_modal.html';
import { ModalOverlay } from './modal_overlay';

const module = uiModules.get('kibana');

import { CONFIRM_BUTTON, CANCEL_BUTTON } from 'ui_framework/components/modal/confirm_modal';

export const ConfirmationButtonTypes = {
  CONFIRM: CONFIRM_BUTTON,
  CANCEL: CANCEL_BUTTON
};

/**
 * @typedef {Object} ConfirmModalOptions
 * @property {String} confirmButtonText
 * @property {String=} cancelButtonText
 * @property {function} onConfirm
 * @property {function=} onCancel
 * @property {String=} title - If given, shows a title on the confirm modal.
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
      defaultFocusedButton: ConfirmationButtonTypes.CONFIRM
    };

    if (!customOptions.confirmButtonText || !customOptions.onConfirm) {
      throw new Error('Please specify confirmation button text and onConfirm action');
    }

    const options = Object.assign(defaultOptions, customOptions);

    // Special handling for onClose - if no specific callback was supplied, default to the
    // onCancel callback.
    options.onClose = customOptions.onClose || options.onCancel;

    const confirmScope = $rootScope.$new();

    confirmScope.message = message;
    confirmScope.defaultFocusedButton = options.defaultFocusedButton;
    confirmScope.confirmButtonText = options.confirmButtonText;
    confirmScope.cancelButtonText = options.cancelButtonText;
    confirmScope.title = options.title;
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
