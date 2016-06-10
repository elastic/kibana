import {assign} from 'lodash';
import IndexedArray from 'ui/indexed_array';

export default class ManagementSection {

  /**
   * @param {string} id
   * @param {object} options
   * @param {number|null} options.order
   * @param {string|null} options.display - defaults to id
   * @param {string|null} options.url - defaults based on path
   * @param {string|null} options.path - used to create url within management
   * @param {string|null} options.info
   * @returns {ManagementSection}
   */

  constructor(id, options = {}) {
    this.display = id;
    this.id = id;
    this.items = new IndexedArray({
      index: ['id'],
      order: ['order']
    });

    if (!options.url) {
      options.url = '#/management/' + options.path || '';
    }

    assign(this, options);
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
    return this.items.byId[id];
  }
}
