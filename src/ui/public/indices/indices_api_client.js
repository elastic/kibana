import { Notifier } from 'ui/notify';
import { resolve as resolveUrl, format as formatUrl } from 'url';
import { pick, mapValues } from 'lodash';

function join(...uriComponents) {
  return uriComponents.filter(Boolean).map(encodeURIComponent).join('/');
}

function getUrl(apiBaseUrl, path, query) {
  const noNullsQuery = pick(query, value => value != null);
  const noArraysQuery = mapValues(noNullsQuery, value => (
    Array.isArray(value) ? JSON.stringify(value) : value
  ));

  return resolveUrl(apiBaseUrl, formatUrl({
    pathname: join(...path),
    query: noArraysQuery,
  }));
}

export function indicesApiClient($http, basePath) {
  const apiBaseUrl = `${basePath}/api/indices/`;
  const notify = new Notifier({ location: 'Indices API' });

  function request(method, url, body) {
    return $http({
      method,
      url,
      data: body,
    })
    .then(resp => resp.data)
    .catch((resp) => {
      // convert $http errors into actual error objects
      const respBody = resp.data;
      const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);
      err.status = resp.status;
      err.body = respBody;
      throw err;
    });
  }

  class IndicesApiClient {
    search(options = {}) {
      const url = getUrl(apiBaseUrl, ['search'], options);
      return notify.event(`search(${options.pattern})`, () => (
        request('GET', url).then(resp => resp.indices)
      ));
    }
  }

  return new IndicesApiClient();
}
