define(function (require) {
  return function MapperService(Private, Promise, es, config, kbnIndex) {
    let _ = require('lodash');
    let moment = require('moment');

    let IndexPatternMissingIndices = require('ui/errors').IndexPatternMissingIndices;
    let transformMappingIntoFields = Private(require('ui/index_patterns/_transform_mapping_into_fields'));
    let intervals = Private(require('ui/index_patterns/_intervals'));
    let patternToWildcard = Private(require('ui/index_patterns/_pattern_to_wildcard'));

    let LocalCache = Private(require('ui/index_patterns/_local_cache'));

    function Mapper() {

      // Save a reference to mapper
      let self = this;

      // proper-ish cache, keeps a clean copy of the object, only returns copies of it's copy
      let fieldCache = self.cache = new LocalCache();

      /**
       * Gets an object containing all fields with their mappings
       * @param {dataSource} dataSource
       * @param {boolean} skipIndexPatternCache - should we ping the index-pattern objects
       * @returns {Promise}
       * @async
       */
      self.getFieldsForIndexPattern = function (indexPattern, skipIndexPatternCache) {
        let id = indexPattern.id;

        let cache = fieldCache.get(id);
        if (cache) return Promise.resolve(cache);

        if (!skipIndexPatternCache) {
          return es.get({
            index: kbnIndex,
            type: 'index-pattern',
            id: id,
            _sourceInclude: ['fields']
          })
          .then(function (resp) {
            if (resp.found && resp._source.fields) {
              fieldCache.set(id, JSON.parse(resp._source.fields));
            }
            return self.getFieldsForIndexPattern(indexPattern, true);
          });
        }

        let promise = Promise.resolve(id);
        if (indexPattern.intervalName) {
          promise = self.getIndicesForIndexPattern(indexPattern)
          .then(function (existing) {
            if (existing.matches.length === 0) throw new IndexPatternMissingIndices();
            return existing.matches.slice(-config.get('indexPattern:fieldMapping:lookBack')); // Grab the most recent
          });
        }

        return promise.then(function (indexList) {
          return es.indices.getFieldMapping({
            index: indexList,
            field: '*',
            ignoreUnavailable: _.isArray(indexList),
            allowNoIndices: false,
            includeDefaults: true
          });
        })
        .catch(handleMissingIndexPattern)
        .then(transformMappingIntoFields)
        .then(function (fields) {
          fieldCache.set(id, fields);
          return fieldCache.get(id);
        });
      };

      self.getIndicesForIndexPattern = function (indexPattern) {
        return es.indices.getAliases({
          index: patternToWildcard(indexPattern.id)
        })
        .then(function (resp) {
          // let all = Object.keys(resp).sort();
          let all = _(resp)
          .map(function (index, key) {
            if (index.aliases) {
              return [Object.keys(index.aliases), key];
            } else {
              return key;
            }
          })
          .flattenDeep()
          .sort()
          .uniq(true)
          .value();

          let matches = all.filter(function (existingIndex) {
            let parsed = moment(existingIndex, indexPattern.id);
            return existingIndex === parsed.format(indexPattern.id);
          });

          return {
            all: all,
            matches: matches
          };
        })
        .catch(handleMissingIndexPattern);
      };

      /**
       * Clears mapping caches from elasticsearch and from local object
       * @param {dataSource} dataSource
       * @returns {Promise}
       * @async
       */
      self.clearCache = function (indexPattern) {
        fieldCache.clear(indexPattern);
        return Promise.resolve();
      };
    }

    function handleMissingIndexPattern(err) {
      if (err.status >= 400) {
        // transform specific error type
        return Promise.reject(new IndexPatternMissingIndices());
      } else {
        // rethrow all others
        throw err;
      }
    }

    return new Mapper();
  };
});
