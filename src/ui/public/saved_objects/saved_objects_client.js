import { resolve as resolveUrl, format as formatUrl } from 'url';
import { pick, get } from 'lodash';
import { keysToSnakeCaseShallow, keysToCamelCaseShallow } from '../../../utils/case_conversion';

import { SavedObject } from './saved_object';

const join = (...uriComponents) => (
  uriComponents.filter(Boolean).map(encodeURIComponent).join('/')
);

export class SavedObjectsClient {
  constructor($http, basePath, PromiseCtor = Promise) {
    this._$http = $http;
    this._apiBaseUrl = `${basePath}/api/saved_objects/`;
    this._PromiseCtor = PromiseCtor;
  }

  get(type, id) {
    if (!type || !id) {
      return this._PromiseCtor.reject(new Error('requires type and id'));
    }

    return this._request('GET', this._getUrl([type, id])).then(resp => {
      return this.createSavedObject(resp);
    });
  }

  delete(type, id) {
    if (!type || !id) {
      return this._PromiseCtor.reject(new Error('requires type and id'));
    }

    return this._request('DELETE', this._getUrl([type, id]));
  }

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

  create(type, body) {
    if (!type || !body) {
      return this._PromiseCtor.reject(new Error('requires type and body'));
    }

    const url = this._getUrl([type]);

    return this._request('POST', url, body);
  }

  find(options = {}) {
    const url = this._getUrl([options.type], keysToSnakeCaseShallow(options));

    return this._request('GET', url).then(resp => {
      resp.saved_objects = resp.saved_objects.map(d => this.createSavedObject(d));
      return keysToCamelCaseShallow(resp);
    });
  }

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
        const respBody = resp.data || {};
        const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);

        err.status = resp.status;
        err.body = respBody;

        throw err;
      });
  }
}
