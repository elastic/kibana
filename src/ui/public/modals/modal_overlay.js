import angular from 'angular';
import modalOverlayTemplate from './modal_overlay.html';

/**
 * Appends the modal to the dom on instantiation, and removes it when destroy is called.
 */
export class ModalOverlay {
  constructor(modalElement) {
    this.overlayElement = angular.element(modalOverlayTemplate);
    this.overlayElement.append(modalElement);

    angular.element(document.body).append(this.overlayElement);
  }

  /**
   * Removes the overlay and modal from the dom.
   */
  destroy() {
    this.overlayElement.remove();
  }
}
