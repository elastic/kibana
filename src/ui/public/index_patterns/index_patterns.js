import 'ui/filters/short_dots';
import _ from 'lodash';
import errors from 'ui/errors';
import IndexPatternsIndexPatternProvider from 'ui/index_patterns/_index_pattern';
import IndexPatternsPatternCacheProvider from 'ui/index_patterns/_pattern_cache';
import IndexPatternsGetIdsProvider from 'ui/index_patterns/_get_ids';
import IndexPatternsIntervalsProvider from 'ui/index_patterns/_intervals';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import uiModules from 'ui/modules';
import chrome from 'ui/chrome';

let module = uiModules.get('kibana/index_patterns');

function IndexPatternsProvider(es, Notifier, Private, Promise, kbnIndex, $http) {
  let self = this;

  let IndexPattern = Private(IndexPatternsIndexPatternProvider);
  let patternCache = Private(IndexPatternsPatternCacheProvider);

  let notify = new Notifier({ location: 'IndexPatterns Service'});

  self.get = function (id) {
    if (!id) return self.make();

    let cache = patternCache.get(id);
    return cache || patternCache.set(id, self.make(id));
  };

  self.make = function (id) {
    return (new IndexPattern(id)).init();
  };

  self.delete = function (pattern) {
    self.getIds.clearCache();
    pattern.destroy();

    return es.delete({
      index: kbnIndex,
      type: 'index-pattern',
      id: pattern.id
    });
  };

  /**
   * Gets an object containing all fields with their mappings
   * @param {string} pattern
   * @returns {Promise}
   * @async
   */
  self.getFieldsForIndexPattern = function (pattern) {
    $http.get(chrome.addBasePath(`/api/kibana/ingest/${pattern}/_fields`))
    .then((response) => {
      return response.data;
    })
    .catch(handleMissingIndexPattern);
  };

  /**
   * Gets an object containing all fields with their mappings
   * @param {string} pattern
   * @returns {Promise}
   * @async
   */
  self.getIndicesForIndexPattern = function (pattern) {
    $http.get(chrome.addBasePath(`/api/kibana/ingest/${pattern}/_indices`))
    .then((response) => {
      return response.data;
    })
    .catch(handleMissingIndexPattern);
  };

  self.errors = {
    MissingIndices: errors.IndexPatternMissingIndices
  };

  self.cache = patternCache;
  self.getIds = Private(IndexPatternsGetIdsProvider);
  self.intervals = Private(IndexPatternsIntervalsProvider);
  self.fieldFormats = Private(RegistryFieldFormatsProvider);
  self.IndexPattern = IndexPattern;

  function handleMissingIndexPattern(err) {
    if (err.status >= 400) {
      // transform specific error type
      return Promise.reject(new errors.IndexPatternMissingIndices());
    } else {
      // rethrow all others
      throw err;
    }
  }
}

module.service('indexPatterns', Private => Private(IndexPatternsProvider));
export default IndexPatternsProvider;
