import { assign } from 'lodash';
import IndexedArray from 'ui/indexed_array';

export default class ManagementSection {

  /**
   * @param {string} id
   * @param {object} options
   * @param {number|null} options.order
   * @param {string|null} options.display - defaults to id
   * @param {string|null} options.url - defaults to ''
   * @param {string|null} options.info
   * @param {boolean|null} options.visible - defaults to true
   * @param {boolean|null} options.disabled - defaults to false
   * @param {string|null} options.tooltip - defaults to ''
   * @returns {ManagementSection}
   */

  constructor(id, options = {}) {
    this.display = id;
    this.id = id;
    this.items = new IndexedArray({
      index: ['id'],
      order: ['order']
    });
    this.visible = true;
    this.disabled = false;
    this.tooltip = '';
    this.url = '';

    assign(this, options);
  }

  get visibleItems() {
    return this.items.inOrder.filter(item => item.visible);
  }

  /**
   * Registers a sub-section
   *
   * @param {string} id
   * @param {object} options
   * @returns {ManagementSection}
   */

  register(id, options = {}) {
    const item = new ManagementSection(id, assign(options, { parent: this }));

    if (this.hasItem(id)) {
      throw new Error(`'${id}' is already registered`);
    }

    this.items.push(item);

    return item;
  }

  /**
  * Deregisters a section
  *
  * @param {string} id
  */
  deregister(id) {
    this.items.remove(item => item.id === id);
  }

  /**
   * Determine if an id is already registered
   *
   * @param {string} id
   * @returns {boolean}
   */

  hasItem(id) {
    return this.items.byId.hasOwnProperty(id);
  }

  /**
   * Fetches a section by id
   *
   * @param {string} id
   * @returns {ManagementSection}
   */

  getSection(id) {
    if (!id) {
      return;
    }

    const sectionPath = id.split('/');
    return sectionPath.reduce((currentSection, nextSection) => {
      if (!currentSection) {
        return;
      }

      return currentSection.items.byId[nextSection];
    }, this);
  }

  hide() {
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  disable() {
    this.disabled = true;
  }

  enable() {
    this.disabled = false;
  }
}
