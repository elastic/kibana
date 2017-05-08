import { resolve as resolveUrl, format as formatUrl } from 'url';

import { pick } from 'lodash';
import 'whatwg-fetch';

const join = (...uriComponents) => (
  uriComponents.filter(Boolean).map(encodeURIComponent).join('/')
);

export class SavedObjectsClient {
  constructor($http, basePath) {
    this._$http = $http;
    this._apiBaseUrl = `${basePath}/api/kibana/saved_objects/`;
  }

  _getUrl(path, query) {
    return resolveUrl(this._apiBaseUrl, formatUrl({
      pathname: join(...path),
      query: pick(query, value => value != null)
    }));
  }

  _request(method, url, body) {
    return this._$http({
      method,
      url,
      data: body,
    })
    .then(resp => resp.data)
    .catch((resp) => {
      const respBody = resp.data;
      const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);
      err.status = resp.status;
      err.body = respBody;
      throw err;
    });
  }

  get(type, id) {
    return this._request('GET', this._getUrl([type, id]));
  }

  delete(type, id) {
    return this._request('DELETE', this._getUrl([type, id]));
  }

  update(type, id, body, options = {}) {
    const { allowTitleConflict } = options;
    return this._request('PUT', this._getUrl([type, id]), { body }, {
      allowTitleConflict
    });
  }

  create(type, id, body, options = {}) {
    const { allowTitleConflict } = options;
    return this.save(type, id, body, {
      allowTitleConflict,
      allowOverwrite: false
    });
  }

  save(type, id, body, options = {}) {
    const { allowTitleConflict, allowOverwrite = true } = options;

    const url = this._getUrl([type, id], {
      allow_title_conflict: allowTitleConflict,
      allow_overwrite: allowOverwrite
    });
    return this._request('POST', url, { body });
  }

  find(type, options = {}) {
    const { filter, size } = options;
    if (!type) throw new Error('`type` is a required parameter');

    const url = this._getUrl([type, '_find']);
    return this._request('POST', url, {
      filter,
      size
    });
  }

  // src/ui/public/index_patterns/_get_ids.js
  getIds(type) {
    return this._request('GET', this._getUrl([type, '_ids']));
  }

  mget(docRequests) {
    return this._request('POST', this._getUrl(['_mget']), { reqs: docRequests });
  }

  scanAndMap(type, map) {
    const url = this._getUrl([type, '_scan']);
    let all = [];

    const getMoreUntilDone = resp => {
      const { hits, next_page_id: nextPageId } = resp;

      all = all.concat(hits.map((hit, i) => (
        map(hit, all.length + i)
      )));

      if (nextPageId) {
        return this._request('POST', url, { next_page_id: nextPageId })
          .then(getMoreUntilDone);
      } else {
        return all;
      }
    };

    return this._request('GET', url)
      .then(getMoreUntilDone);
  }

  getDefinedTypes() {
    const url = this._getUrl(['types']);
    return this._request('GET', url).then(({ types }) => types);
  }

  defineType(type, mapping) {
    const url = this._getUrl(['types', type]);
    return this._request('POST', url, {
      mapping
    });
  }
}
