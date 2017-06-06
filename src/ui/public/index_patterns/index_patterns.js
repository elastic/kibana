import 'ui/filters/short_dots';
import { IndexPatternMissingIndices } from 'ui/errors';
import { IndexPatternProvider } from 'ui/index_patterns/_index_pattern';
import { IndexPatternsPatternCacheProvider } from 'ui/index_patterns/_pattern_cache';
import { IndexPatternsGetIdsProvider } from 'ui/index_patterns/_get_ids';
import { IndexPatternsIntervalsProvider } from 'ui/index_patterns/_intervals';
import { FieldsFetcherProvider } from './fields_fetcher_provider';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana/index_patterns');

export { IndexPatternsApiClientProvider } from './index_patterns_api_client_provider';
export function IndexPatternsProvider(esAdmin, Notifier, Private, Promise, kbnIndex) {
  const self = this;

  const IndexPattern = Private(IndexPatternProvider);
  const patternCache = Private(IndexPatternsPatternCacheProvider);

  self.get = function (id) {
    if (!id) return self.make();

    const cache = patternCache.get(id);
    return cache || patternCache.set(id, self.make(id));
  };

  self.make = function (id) {
    return (new IndexPattern(id)).init();
  };

  self.delete = function (pattern) {
    self.getIds.clearCache();
    pattern.destroy();

    return esAdmin.delete({
      index: kbnIndex,
      type: 'index-pattern',
      id: pattern.id
    });
  };

  self.errors = {
    MissingIndices: IndexPatternMissingIndices
  };

  self.cache = patternCache;
  self.getIds = Private(IndexPatternsGetIdsProvider);
  self.intervals = Private(IndexPatternsIntervalsProvider);
  self.fieldsFetcher = Private(FieldsFetcherProvider);
  self.fieldFormats = Private(RegistryFieldFormatsProvider);
  self.IndexPattern = IndexPattern;
}

module.service('indexPatterns', Private => Private(IndexPatternsProvider));
