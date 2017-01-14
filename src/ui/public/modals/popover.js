import angular from 'angular';

export class Popover {
  constructor(element) {
    this.element = element;
    // document.body.appendChild(this.element);
    angular.element(document.body).append(this.element);
  }

  /**
   * Removes the element from the dom.
   */
  destroy() {
    // document.body.removeChild(this.element);
    this.element.remove();
  }
}
