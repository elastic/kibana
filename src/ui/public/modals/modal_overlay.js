import angular from 'angular';
import modalOverlayTemplate from './modal_overlay.html';

/**
 * Appends the modal to the dom on instantiation, and removes it when destroy is called.
 */
export class ModalOverlay {
  constructor(modalElement, scope) {
    this.overlayElement = angular.element(modalOverlayTemplate);
    this.overlayElement.append(modalElement);

    const onKeyDown = (event) => {
      if(event.keyCode === 27) {
        scope.onCancel();
      }
    };

    angular.element(document.body).bind('keydown', onKeyDown);
    angular.element(document.body).append(this.overlayElement);
  }

  /**
   * Removes the overlay and modal from the dom.
   */
  destroy() {
    angular.element(document.body).off('keydown');
    this.overlayElement.remove();
  }
}
