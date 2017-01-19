import angular from 'angular';

/**
 * Appends the element to the dom on instantiation, and removes it when destroy is called.
 */
export class Popover {
  constructor(element) {
    this.element = element;
    angular.element(document.body).append(this.element);
  }

  /**
   * Removes the element from the dom.
   */
  destroy() {
    this.element.remove();
  }
}
