import 'ui/filters/short_dots';
import { IndexPatternMissingIndices } from 'ui/errors';
import { IndexPatternProvider } from 'ui/index_patterns/_index_pattern';
import { IndexPatternsPatternCacheProvider } from 'ui/index_patterns/_pattern_cache';
import { IndexPatternsGetIdsProvider } from 'ui/index_patterns/_get_ids';
import { IndexPatternsIntervalsProvider } from 'ui/index_patterns/_intervals';
import { IndexPatternsMapperProvider } from 'ui/index_patterns/_mapper';
import { IndexPatternsPatternToWildcardProvider } from 'ui/index_patterns/_pattern_to_wildcard';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import { uiModules } from 'ui/modules';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

const module = uiModules.get('kibana/index_patterns');

export function IndexPatternsProvider(Private) {
  const self = this;

  const IndexPattern = Private(IndexPatternProvider);
  const patternCache = Private(IndexPatternsPatternCacheProvider);
  const savedObjectsClient = Private(SavedObjectsClientProvider);

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
    return savedObjectsClient.delete('index-pattern', pattern.id);
  };

  self.errors = {
    MissingIndices: IndexPatternMissingIndices
  };

  self.cache = patternCache;
  self.getIds = Private(IndexPatternsGetIdsProvider);
  self.intervals = Private(IndexPatternsIntervalsProvider);
  self.mapper = Private(IndexPatternsMapperProvider);
  self.patternToWildcard = Private(IndexPatternsPatternToWildcardProvider);
  self.fieldFormats = Private(RegistryFieldFormatsProvider);
  self.IndexPattern = IndexPattern;
}

module.service('indexPatterns', Private => Private(IndexPatternsProvider));
