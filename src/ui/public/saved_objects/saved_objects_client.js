import { resolve as resolveUrl, format as formatUrl } from 'url';
import { pick, get, cloneDeep, throttle } from 'lodash';
import { keysToSnakeCaseShallow, keysToCamelCaseShallow } from '../../../utils/case_conversion';

import { SavedObject } from './saved_object';
import chrome from 'ui/chrome';

const join = (...uriComponents) => (
  uriComponents.filter(Boolean).map(encodeURIComponent).join('/')
);

/**
 * Interval that requests are batched for
 * @type {integer}
 */
const BATCH_INTERVAL = 100;

export class SavedObjectsClient {
  constructor($http, basePath = chrome.getBasePath(), PromiseCtor = Promise) {
    this._$http = $http;
    this._apiBaseUrl = `${basePath}/api/saved_objects/`;
    this._PromiseCtor = PromiseCtor;
    this.batchQueue = [];
  }

  /**
  * Persists an object
  *
  * @param {string} type
  * @param {object} body - { attributes: {}, id: myId }
  * @param {object} options
  * @param {boolean} options.overwrite - defaults to false
  * @returns {promise}
  */
  create(type, body = {}, options = {}) {
    if (!type || !body.attributes) {
      return this._PromiseCtor.reject(new Error('requires type and attributes'));
    }

    const url = this._getUrl([type], options);

    return this._request('POST', url, body);
  }

  /**
   * Deletes an object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  delete(type, id) {
    if (!type || !id) {
      return this._PromiseCtor.reject(new Error('requires type and id'));
    }

    return this._request('DELETE', this._getUrl([type, id]));
  }

  /**
   * Search for objects
   *
   * @param {object} options
   * @param {string} options.type
   * @param {string} options.search
   * @param {string} options.searchFields - see Elasticsearch Simple Query String
   *                                        Query field argument for more information
   * @param {integer} options.page - defaults to 1
   * @param {integer} options.perPage - defaults to 20
   * @param {array} option.fields - fields to be returned. Returns all unless defined
   * @returns {promise}
   */
  find(options = {}) {
    const url = this._getUrl([options.type], keysToSnakeCaseShallow(options));

    return this._request('GET', url).then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this.createSavedObject(d));
      return keysToCamelCaseShallow(resp);
    });
  }

  /**
   * Fetches a single object
   *
   * @param {string} type
   * @param {string} id
   * @returns {promise}
   */
  get(type, id) {
    if (!type || !id) {
      return this._PromiseCtor.reject(new Error('requires type and id'));
    }

    return new this._PromiseCtor((resolve, reject) => {
      this.batchQueue.push({ type, id, resolve, reject });
      this.processBatchQueue();
    });
  }

  /**
   * Returns an array of objects by id
   *
   * @param {array} objects - an array ids, or an array of objects containing id and optionally type
   * @returns {promise} Returns promise containing array of documents
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  bulkGet(objects = []) {
    const url = this._getUrl(['bulk_get']);

    return this._request('POST', url, objects).then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this.createSavedObject(d));
      return keysToCamelCaseShallow(resp);
    });
  }

  /**
   * Updates an object
   *
   * @param {string} type
   * @param {string} id
   * @param {object} options
   * @param {integer} options.version - ensures version matches that of persisted object
   * @returns {promise}
   */
  update(type, id, attributes, { version } = {}) {
    if (!type || !id || !attributes) {
      return this._PromiseCtor.reject(new Error('requires type, id and attributes'));
    }

    const body = {
      attributes,
      version
    };

    return this._request('PUT', this._getUrl([type, id]), body);
  }

  /**
   * Throttled processing of get requests into bulk requests at 100ms interval
   */
  processBatchQueue = throttle(() => {
    const queue = cloneDeep(this.batchQueue);
    this.batchQueue = [];

    this.bulkGet(queue).then(({ savedObjects }) => {
      queue.forEach((queueItem) => {
        const foundObject = savedObjects.find(savedObject => {
          return savedObject.id === queueItem.id & savedObject.type === queueItem.type;
        });

        if (!foundObject) {
          return queueItem.resolve(this.createSavedObject(pick(queueItem, ['id', 'type'])));
        }

        queueItem.resolve(foundObject);
      });
    });

  }, BATCH_INTERVAL, { leading: false })

  createSavedObject(options) {
    return new SavedObject(this, options);
  }

  _getUrl(path, query) {
    if (!path && !query) {
      return this._apiBaseUrl;
    }

    return resolveUrl(this._apiBaseUrl, formatUrl({
      pathname: join(...path),
      query: pick(query, value => value != null)
    }));
  }

  _request(method, url, body) {
    const options = { method, url, data: body };

    if (method === 'GET' && body) {
      return this._PromiseCtor.reject(new Error('body not permitted for GET requests'));
    }

    return this._$http(options)
      .then(resp => get(resp, 'data'))
      .catch(resp => {
        const respBody = get(resp, 'data', {});
        const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);

        err.statusCode = respBody.statusCode || resp.status;
        err.body = respBody;

        throw err;
      });
  }
}
