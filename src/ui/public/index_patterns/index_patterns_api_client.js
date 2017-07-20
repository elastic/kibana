import { resolve as resolveUrl, format as formatUrl } from 'url';

import { pick, mapValues } from 'lodash';

import { IndexPatternMissingIndices } from 'ui/errors';
import { Notifier } from 'ui/notify';

export function createIndexPatternsApiClient($http, basePath) {
  const apiBaseUrl = `${basePath}/api/index_patterns/`;
  const notify = new Notifier({ location: 'Index Patterns API' });

  function join(...uriComponents) {
    return uriComponents.filter(Boolean).map(encodeURIComponent).join('/');
  }

  function getUrl(path, query) {
    const noNullsQuery = pick(query, value => value != null);
    const noArraysQuery = mapValues(noNullsQuery, value => (
      Array.isArray(value) ? JSON.stringify(value) : value
    ));

    return resolveUrl(apiBaseUrl, formatUrl({
      pathname: join(...path),
      query: noArraysQuery,
    }));
  }

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

      if (resp.status === 404 && respBody.code === 'no_matching_indices') {
        throw new IndexPatternMissingIndices(respBody.message);
      }

      const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);
      err.status = resp.status;
      err.body = respBody;
      throw err;
    });
  }

  class IndexPatternsApiClient {
    getFieldsForTimePattern(options = {}) {
      const {
        pattern,
        lookBack,
        metaFields,
      } = options;

      const url = getUrl(['_fields_for_time_pattern'], {
        pattern,
        look_back: lookBack,
        meta_fields: metaFields,
      });

      return notify.event(`getFieldsForTimePattern(${pattern})`, () => (
        request('GET', url).then(resp => resp.fields)
      ));
    }

    getFieldsForWildcard(options = {}) {
      const {
        pattern,
        metaFields,
      } = options;

      const url = getUrl(['_fields_for_wildcard'], {
        pattern,
        meta_fields: metaFields,
      });

      return notify.event(`getFieldsForWildcard(${pattern})`, () => (
        request('GET', url).then(resp => resp.fields)
      ));
    }

    testTimePattern(options = {}) {
      const {
        pattern
      } = options;

      const url = getUrl(['_test_time_pattern'], {
        pattern,
      });

      return notify.event(`testTimePattern(${pattern})`, () => (
        request('GET', url)
      ));
    }
  }

  return new IndexPatternsApiClient();
}
