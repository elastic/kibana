import _ from 'lodash';
import { SavedObjectNotFound, DuplicateField, IndexPatternMissingIndices } from '../errors';
import angular from 'angular';
import { fieldFormats } from '../registry/field_formats';
import UtilsMappingSetupProvider from '../utils/mapping_setup';
import { Notifier } from '../notify';

import { getComputedFields } from './_get_computed_fields';
import { formatHit } from './_format_hit';
import { IndexPatternsGetProvider } from './_get';
import { IndexPatternsIntervalsProvider } from './_intervals';
import { IndexPatternsFieldListProvider } from './_field_list';
import { IndexPatternsFlattenHitProvider } from './_flatten_hit';
import { IndexPatternsPatternCacheProvider } from './_pattern_cache';
import { FieldsFetcherProvider } from './fields_fetcher_provider';
import { IsUserAwareOfUnsupportedTimePatternProvider } from './unsupported_time_patterns';
import { SavedObjectsClientProvider, findObjectByTitle } from '../saved_objects';

export function getRoutes() {
  return {
    edit: '/management/kibana/indices/{{id}}',
    addField: '/management/kibana/indices/{{id}}/create-field',
    indexedFields: '/management/kibana/indices/{{id}}?_a=(tab:indexedFields)',
    scriptedFields: '/management/kibana/indices/{{id}}?_a=(tab:scriptedFields)',
    sourceFilters: '/management/kibana/indices/{{id}}?_a=(tab:sourceFilters)'
  };
}

export function IndexPatternProvider(Private, config, Promise, confirmModalPromise, kbnUrl) {
  const getConfig = (...args) => config.get(...args);
  const getIds = Private(IndexPatternsGetProvider)('id');
  const fieldsFetcher = Private(FieldsFetcherProvider);
  const intervals = Private(IndexPatternsIntervalsProvider);
  const mappingSetup = Private(UtilsMappingSetupProvider);
  const FieldList = Private(IndexPatternsFieldListProvider);
  const flattenHit = Private(IndexPatternsFlattenHitProvider);
  const patternCache = Private(IndexPatternsPatternCacheProvider);
  const isUserAwareOfUnsupportedTimePattern = Private(IsUserAwareOfUnsupportedTimePatternProvider);
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  const fieldformats = fieldFormats;

  const type = 'index-pattern';
  const notify = new Notifier();
  const configWatchers = new WeakMap();

  const mapping = mappingSetup.expandShorthand({
    title: 'text',
    timeFieldName: 'keyword',
    intervalName: 'keyword',
    fields: 'json',
    sourceFilters: 'json',
    fieldFormatMap: {
      type: 'text',
      _serialize(map = {}) {
        const serialized = _.transform(map, serializeFieldFormatMap);
        return _.isEmpty(serialized) ? undefined : angular.toJson(serialized);
      },
      _deserialize(map = '{}') {
        return _.mapValues(angular.fromJson(map), deserializeFieldFormatMap);
      }
    }
  });

  function serializeFieldFormatMap(flat, format, field) {
    if (format) {
      flat[field] = format;
    }
  }

  function deserializeFieldFormatMap(mapping) {
    const FieldFormat = fieldformats.byId[mapping.id];
    return FieldFormat && new FieldFormat(mapping.params, getConfig);
  }

  function updateFromElasticSearch(indexPattern, response) {
    if (!response.found) {
      const markdownSaveId = indexPattern.id.replace('*', '%2A');

      throw new SavedObjectNotFound(
        type,
        indexPattern.id,
        kbnUrl.eval('#/management/kibana/index?id={{id}}&name=', { id: markdownSaveId })
      );
    }

    _.forOwn(mapping, (fieldMapping, name) => {
      if (!fieldMapping._deserialize) {
        return;
      }
      response._source[name] = fieldMapping._deserialize(response._source[name]);
    });

    // give index pattern all of the values in _source
    _.assign(indexPattern, response._source);

    if (!indexPattern.title) {
      indexPattern.title = indexPattern.id;
    }

    if (indexPattern.isUnsupportedTimePattern()) {
      if (!isUserAwareOfUnsupportedTimePattern(indexPattern)) {
        const warning = (
          'Support for time-intervals has been removed. ' +
          `View the ["${indexPattern.title}" index pattern in management](` +
          kbnUrl.getRouteHref(indexPattern, 'edit') +
          ') for more information.'
        );
        notify.warning(warning, { lifetime: Infinity });
      }
    }

    return indexFields(indexPattern);
  }

  function isFieldRefreshRequired(indexPattern) {
    if (!indexPattern.fields) {
      return true;
    }

    return indexPattern.fields.every(field => {
      // See https://github.com/elastic/kibana/pull/8421
      const hasFieldCaps = ('aggregatable' in field) && ('searchable' in field);

      // See https://github.com/elastic/kibana/pull/11969
      const hasDocValuesFlag = ('readFromDocValues' in field);

      return !hasFieldCaps || !hasDocValuesFlag;
    });
  }

  function indexFields(indexPattern) {
    let promise = Promise.resolve();

    if (!indexPattern.id) {
      return promise;
    }

    if (isFieldRefreshRequired(indexPattern)) {
      promise = indexPattern.refreshFields();
    }

    return promise.then(() => {
      initFields(indexPattern);
    });
  }

  function setId(indexPattern, id) {
    indexPattern.id = id;
    return id;
  }

  function watch(indexPattern) {
    if (configWatchers.has(indexPattern)) {
      return;
    }
    const unwatch = config.watchAll(() => {
      if (indexPattern.fields) {
        initFields(indexPattern); // re-init fields when config changes, but only if we already had fields
      }
    });
    configWatchers.set(indexPattern, { unwatch });
  }

  function unwatch(indexPattern) {
    if (!configWatchers.has(indexPattern)) {
      return;
    }
    configWatchers.get(indexPattern).unwatch();
    configWatchers.delete(indexPattern);
  }

  function initFields(indexPattern, input) {
    const oldValue = indexPattern.fields;
    const newValue = input || oldValue || [];
    indexPattern.fields = new FieldList(indexPattern, newValue);
  }

  function fetchFields(indexPattern) {
    return Promise.resolve()
      .then(() => fieldsFetcher.fetch(indexPattern))
      .then(fields => {
        const scripted = indexPattern.getScriptedFields();
        const all = fields.concat(scripted);
        initFields(indexPattern, all);
      });
  }

  class IndexPattern {
    constructor(id) {
      setId(this, id);
      this.metaFields = config.get('metaFields');
      this.getComputedFields = getComputedFields.bind(this);

      this.flattenHit = flattenHit(this);
      this.formatHit = formatHit(this, fieldformats.getDefaultInstance('string'));
      this.formatField = this.formatHit.formatField;
    }

    get routes() {
      return getRoutes();
    }

    init() {
      watch(this);

      if (!this.id) {
        return Promise.resolve(this); // no id === no elasticsearch document
      }

      return savedObjectsClient.get(type, this.id)
        .then(resp => {
          // temporary compatability for savedObjectsClient

          return {
            _id: resp.id,
            _type: resp.type,
            _source: _.cloneDeep(resp.attributes),
            found: resp._version ? true : false
          };
        })
        .then(response => updateFromElasticSearch(this, response))
        .then(() => this);
    }

    // Get the source filtering configuration for that index.
    getSourceFiltering() {
      return {
        excludes: this.sourceFilters && this.sourceFilters.map(filter => filter.value) || []
      };
    }

    addScriptedField(name, script, type = 'string', lang) {
      const scriptedFields = this.getScriptedFields();
      const names = _.pluck(scriptedFields, 'name');

      if (_.contains(names, name)) {
        throw new DuplicateField(name);
      }

      this.fields.push({
        name: name,
        script: script,
        type: type,
        scripted: true,
        lang: lang
      });

      this.save();
    }

    removeScriptedField(name) {
      const fieldIndex = _.findIndex(this.fields, {
        name: name,
        scripted: true
      });
      this.fields.splice(fieldIndex, 1);
      this.save();
    }

    popularizeField(fieldName, unit = 1) {
      const field = _.get(this, ['fields', 'byName', fieldName]);
      if (!field) {
        return;
      }
      const count = Math.max((field.count || 0) + unit, 0);
      if (field.count === count) {
        return;
      }
      field.count = count;
      this.save();
    }

    getNonScriptedFields() {
      return _.where(this.fields, { scripted: false });
    }

    getScriptedFields() {
      return _.where(this.fields, { scripted: true });
    }

    getInterval() {
      return this.intervalName && _.find(intervals, { name: this.intervalName });
    }

    toIndexList(start, stop, sortDirection) {
      return this
        .toDetailedIndexList(start, stop, sortDirection)
        .then(detailedIndices => {
          if (!Array.isArray(detailedIndices)) {
            return detailedIndices.index;
          }
          return detailedIndices.map(({ index }) => index).join(',');
        });
    }

    toDetailedIndexList(start, stop, sortDirection) {
      return Promise.resolve().then(() => {
        if (this.isTimeBasedInterval()) {
          return intervals.toIndexList(
            this.title, this.getInterval(), start, stop, sortDirection
          );
        }

        return [
          {
            index: this.title,
            min: -Infinity,
            max: Infinity
          }
        ];
      });
    }

    isTimeBased() {
      return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
    }

    isTimeBasedInterval() {
      return this.isTimeBased() && !!this.getInterval();
    }

    isUnsupportedTimePattern() {
      return !!this.intervalName;
    }

    isTimeBasedWildcard() {
      return this.isTimeBased() && this.isWildcard();
    }

    getTimeField() {
      if (!this.timeFieldName || !this.fields || !this.fields.byName) return;
      return this.fields.byName[this.timeFieldName];
    }

    isWildcard() {
      return _.includes(this.title, '*');
    }

    prepBody() {
      const body = {};

      // serialize json fields
      _.forOwn(mapping, (fieldMapping, fieldName) => {
        if (this[fieldName] != null) {
          body[fieldName] = (fieldMapping._serialize)
            ? fieldMapping._serialize(this[fieldName])
            : this[fieldName];
        }
      });

      // clear the indexPattern list cache
      getIds.clearCache();
      return body;
    }

    /**
     * Returns a promise that resolves to true if either the title is unique, or if the user confirmed they
     * wished to save the duplicate title.  Promise is rejected if the user rejects the confirmation.
     */
    warnIfDuplicateTitle() {
      return findObjectByTitle(savedObjectsClient, type, this.title)
        .then(duplicate => {
          if (!duplicate) return false;
          if (duplicate.id === this.id) return false;

          const confirmMessage =
            `An index pattern with the title '${this.title}' already exists.`;

          return confirmModalPromise(confirmMessage, { confirmButtonText: 'Go to existing pattern' })
            .then(() => {
              kbnUrl.redirect('/management/kibana/indices/{{id}}', { id: duplicate.id });
              return true;
            }).catch(() => {
              return true;
            });
        });
    }

    create() {
      return this.warnIfDuplicateTitle().then((isDuplicate) => {
        if (isDuplicate) return;

        const body = this.prepBody();

        return savedObjectsClient.create(type, body, { id: this.id })
          .then(response => setId(this, response.id))
          .catch(err => {
            if (err.statusCode !== 409) {
              return Promise.resolve(false);
            }
            const confirmMessage = 'Are you sure you want to overwrite this?';

            return confirmModalPromise(confirmMessage, { confirmButtonText: 'Overwrite' })
              .then(() => Promise
                .try(() => {
                  const cached = patternCache.get(this.id);
                  if (cached) {
                    return cached.then(pattern => pattern.destroy());
                  }
                })
                .then(() => savedObjectsClient.create(type, body, { id: this.id, overwrite: true }))
                .then(response => setId(this, response.id)),
              _.constant(false) // if the user doesn't overwrite, resolve with false
              );
          });
      });
    }

    save() {
      return savedObjectsClient.update(type, this.id, this.prepBody())
        .then(({ id }) => setId(this, id));
    }

    refreshFields() {
      return fetchFields(this)
        .then(() => this.save())
        .catch((err) => {
          notify.error(err);
          // https://github.com/elastic/kibana/issues/9224
          // This call will attempt to remap fields from the matching
          // ES index which may not actually exist. In that scenario,
          // we still want to notify the user that there is a problem
          // but we do not want to potentially make any pages unusable
          // so do not rethrow the error here
          if (err instanceof IndexPatternMissingIndices) {
            return [];
          }

          throw err;
        });
    }

    toJSON() {
      return this.id;
    }

    toString() {
      return '' + this.toJSON();
    }

    destroy() {
      unwatch(this);
      patternCache.clear(this.id);
      return savedObjectsClient.delete(type, this.id);
    }
  }

  return IndexPattern;
}
