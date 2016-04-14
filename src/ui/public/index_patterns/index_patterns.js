define(function (require) {
  let module = require('ui/modules').get('kibana/index_patterns');
  require('ui/filters/short_dots');

  function IndexPatternsProvider(es, Notifier, Private, Promise, kbnIndex) {
    let self = this;
    let _ = require('lodash');
    let errors = require('ui/errors');

    let IndexPattern = Private(require('ui/index_patterns/_index_pattern'));
    let patternCache = Private(require('ui/index_patterns/_pattern_cache'));

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

    self.errors = {
      MissingIndices: errors.IndexPatternMissingIndices
    };

    self.cache = patternCache;
    self.getIds = Private(require('ui/index_patterns/_get_ids'));
    self.intervals = Private(require('ui/index_patterns/_intervals'));
    self.mapper = Private(require('ui/index_patterns/_mapper'));
    self.patternToWildcard = Private(require('ui/index_patterns/_pattern_to_wildcard'));
    self.fieldFormats = Private(require('ui/registry/field_formats'));
    self.IndexPattern = IndexPattern;
  }

  module.service('indexPatterns', Private => Private(IndexPatternsProvider));
  return IndexPatternsProvider;
});
