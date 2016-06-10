import {assign} from 'lodash';
import IndexedArray from 'ui/indexed_array';

export default class ManagementSection {

  /**
   * @param {string} id
   * @param {object} options
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
   * Registers a section
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
