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

import _ from 'lodash';

import { resolve as resolveUrl } from 'url';
import { keysToSnakeCaseShallow, keysToCamelCaseShallow } from '../../../utils/case_conversion';
import { SavedObject } from './saved_object';
import { isAutoCreateIndexError, showAutoCreateIndexErrorPage } from '../error_auto_create_index';
import { kfetch } from 'ui/kfetch';

const join = (...uriComponents) => (
  uriComponents.filter(Boolean).map(encodeURIComponent).join('/')
);

/**
 * Interval that requests are batched for
 * @type {integer}
 */
const BATCH_INTERVAL = 100;

const API_BASE_URL = '/api/saved_objects/';

export class SavedObjectsClient {
  constructor() {
    this.batchQueue = [];
  }

  /**
   * Persists an object
   *
   * @param {string} type
   * @param {object} [attributes={}]
   * @param {object} [options={}]
   * @property {string} [options.id] - force id on creation, not recommended
   * @property {boolean} [options.overwrite=false]
   * @property {object} [options.migrationVersion]
   * @returns {promise} - SavedObject({ id, type, version, attributes })
   */
  create = (type, attributes = {}, options = {}) => {
    if (!type || !attributes) {
      return Promise.reject(new Error('requires type and attributes'));
    }

    const path = this._getPath([type, options.id]);
    const query = _.pick(options, ['overwrite']);

    return this._request({ method: 'POST', path, query, body: { attributes, migrationVersion: options.migrationVersion } })
      .catch(error => {
        if (isAutoCreateIndexError(error)) {
          return showAutoCreateIndexErrorPage();
        }

        throw error;
      })
      .then(resp => this._createSavedObject(resp));
  }

  /**
   * Creates multiple documents at once
   *
   * @param {array} objects - [{ type, id, attributes, migrationVersion }]
   * @param {object} [options={}]
   * @property {boolean} [options.overwrite=false]
   * @returns {promise} - { savedObjects: [{ id, type, version, attributes, error: { message } }]}
   */
  bulkCreate = (objects = [], options = {}) => {
    const path = this._getPath(['_bulk_create']);
    const query = _.pick(options, ['overwrite']);

    return this._request({ method: 'POST', path, query, body: objects }).then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this._createSavedObject(d));
      return keysToCamelCaseShallow(resp);
    });
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  delete = (type, id) => {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return this._request({ method: 'DELETE', path: this._getPath([type, id]) });
  }

  /**
   * Search for objects
   *
   * @param {object} [options={}]
   * @property {string} options.type
   * @property {string} options.search
   * @property {string} options.searchFields - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @property {integer} [options.page=1]
   * @property {integer} [options.perPage=20]
   * @property {array} options.fields
   * @returns {promise} - { savedObjects: [ SavedObject({ id, type, version, attributes }) ]}
   */
  find = (options = {}) => {
    const path = this._getPath(['_find']);
    const query = keysToSnakeCaseShallow(options);

    return this._request({ method: 'GET', path, query }).then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this._createSavedObject(d));
      return keysToCamelCaseShallow(resp);
    });
  }

  /**
   * Fetches a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise} - SavedObject({ id, type, version, attributes })
   */
  get = (type, id) => {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return new Promise((resolve, reject) => {
      this.batchQueue.push({ type, id, resolve, reject });
      this._processBatchQueue();
    });
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns {promise} - { savedObjects: [ SavedObject({ id, type, version, attributes }) ] }
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  bulkGet = (objects = []) => {
    const path = this._getPath(['_bulk_get']);
    const filteredObjects = objects.map(obj => _.pick(obj, ['id', 'type']));

    return this._request({ method: 'POST', path, body: filteredObjects }).then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this._createSavedObject(d));
      return keysToCamelCaseShallow(resp);
    });
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} attributes
   * @param {object} options
   * @prop {integer} options.version - ensures version matches that of persisted object
   * @prop {object} options.migrationVersion - The optional migrationVersion of this document
   * @returns {promise}
   */
  update(type, id, attributes, { version, migrationVersion } = {}) {
    if (!type || !id || !attributes) {
      return Promise.reject(new Error('requires type, id and attributes'));
    }

    const path = this._getPath([type, id]);
    const body = {
      attributes,
      migrationVersion,
      version
    };

    return this._request({ method: 'PUT', path, body }).then(resp => {
      return this._createSavedObject(resp);
    });
  }

  /**
   * Throttled processing of get requests into bulk requests at 100ms interval
   */
  _processBatchQueue = _.throttle(() => {
    const queue = _.cloneDeep(this.batchQueue);
    this.batchQueue = [];

    this.bulkGet(queue).then(({ savedObjects }) => {
      queue.forEach((queueItem) => {
        const foundObject = savedObjects.find(savedObject => {
          return savedObject.id === queueItem.id & savedObject.type === queueItem.type;
        });

        if (!foundObject) {
          return queueItem.resolve(this._createSavedObject(_.pick(queueItem, ['id', 'type'])));
        }

        queueItem.resolve(foundObject);
      });
    }).catch((err) => {
      queue.forEach((queueItem) => {
        queueItem.reject(err);
      });
    });

  }, BATCH_INTERVAL, { leading: false });

  _createSavedObject(options) {
    return new SavedObject(this, options);
  }

  _getPath(path) {
    if (!path) {
      return API_BASE_URL;
    }

    return resolveUrl(API_BASE_URL, join(...path));
  }

  _request({ method, path, query, body }) {
    if (method === 'GET' && body) {
      return Promise.reject(new Error('body not permitted for GET requests'));
    }

    return kfetch({ method, pathname: path, query, body: JSON.stringify(body) });
  }
}
