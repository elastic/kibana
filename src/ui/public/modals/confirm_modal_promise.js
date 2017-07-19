import { uiModules } from 'ui/modules';
import 'ui/modals';

const module = uiModules.get('kibana');

/**
 * @typedef {Object} PromisifiedConfirmOptions
 * @property {String} confirmButtonText
 * @property {String=} cancelButtonText
 */

/**
 * A "promisified" version of ConfirmModal that binds onCancel and onConfirm to
 * Resolve and Reject methods.
 */
module.factory('confirmModalPromise', function (Promise, confirmModal) {
  /**
   * @param {String} message
   * @param {PromisifiedConfirmOptions} customOptions
   */
  return (message, customOptions) => new Promise((resolve, reject) => {
    const defaultOptions = {
      onConfirm: resolve,
      onCancel: reject
    };
    const confirmOptions = Object.assign(defaultOptions, customOptions);
    confirmModal(message, confirmOptions);
  });
});
