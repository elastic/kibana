/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { assign } from 'lodash';
import { IndexedArray } from '../indexed_array';

export class ManagementSection {

  /**
   * @param {string} id
   * @param {object} options
   * @param {number|null} options.order
   * @param {string|null} options.display - defaults to id
   * @param {string|null} options.url - defaults to ''
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
