import { resolve as resolveUrl, format as formatUrl } from 'url';
import { pick, partial } from 'lodash';

import { SavedObject } from './saved_object';

const join = (...uriComponents) => (
  uriComponents.filter(Boolean).map(encodeURIComponent).join('/')
);

export class SavedObjectsClient {
  constructor($http, basePath) {
    this._$http = $http;
    this._apiBaseUrl = `${basePath}/api/kibana/saved_objects/`;
  }

  get(type, id) {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return this._request('GET', this._getUrl([type, id])).then(resp => {
      return new this.ObjectClass(resp);
    });
  }

  delete(type, id) {
    if (!type || !id) {
      return Promise.reject(new Error('requires type and id'));
    }

    return this._request('DELETE', this._getUrl([type, id]));
  }

  update(type, id, body) {
    if (!type || !id || !body) {
      return Promise.reject(new Error('requires type, id and body'));
    }

    return this._request('PUT', this._getUrl([type, id]), body);
  }

  create(type, body) {
    if (!type || !body) {
      return Promise.reject(new Error('requires type and body'));
    }

    const url = this._getUrl([type]);

    return this._request('POST', url, body);
  }

  find(options = {}) {
    const url = this._getUrl([options.type]);
    const validOptions = pick(options, ['from', 'size', 'fields', 'filter']);

    return this._request('GET', url, validOptions).then(resp => {
      resp.data = resp.data.map(d => new this.ObjectClass(d));
      return resp;
    });
  }

  get ObjectClass() {
    return partial(SavedObject, this);
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
    const options = { method, url };

    if (method === 'GET' && body) {
      options.params = body;
    } else if (body) {
      options.data = body;
    }

    return this._$http(options)
    .catch(resp => {
      const respBody = resp.data || {};
      const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);
      err.status = resp.status;
      err.body = respBody;
      throw err;
    });
  }
}
