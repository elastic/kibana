import '../filters/short_dots';
import { IndexPatternMissingIndices } from '../errors';
import { IndexPatternProvider } from './_index_pattern';
import { IndexPatternsPatternCacheProvider } from './_pattern_cache';
import { IndexPatternsGetProvider } from './_get';
import { IndexPatternsIntervalsProvider } from './_intervals';
import { FieldsFetcherProvider } from './fields_fetcher_provider';
import { fieldFormats } from '../registry/field_formats';
import { uiModules } from '../modules';
const module = uiModules.get('kibana/index_patterns');

export function IndexPatternsProvider(Notifier, Private, config) {
  const self = this;

  const IndexPattern = Private(IndexPatternProvider);
  const patternCache = Private(IndexPatternsPatternCacheProvider);
  const getProvider = Private(IndexPatternsGetProvider);


  self.get = function (id) {
    if (!id) return self.make();

    const cache = patternCache.get(id);
    return cache || patternCache.set(id, self.make(id));
  };

  self.getDefault = async () => {
    const defaultIndexPatternId = config.get('defaultIndex');
    if (defaultIndexPatternId) {
      return await self.get(defaultIndexPatternId);
    }

    return null;
  };

  self.make = function (id) {
    return (new IndexPattern(id)).init();
  };

  self.delete = function (pattern) {
    self.getIds.clearCache();
    return pattern.destroy();
  };

  self.errors = {
    MissingIndices: IndexPatternMissingIndices
  };

  self.cache = patternCache;
  self.getIds = getProvider('id');
  self.getTitles = getProvider('attributes.title');
  self.intervals = Private(IndexPatternsIntervalsProvider);
  self.fieldsFetcher = Private(FieldsFetcherProvider);
  self.fieldFormats = fieldFormats;
  self.IndexPattern = IndexPattern;
}

module.service('indexPatterns', Private => Private(IndexPatternsProvider));
