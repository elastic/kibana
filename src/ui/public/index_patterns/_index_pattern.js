define(function (require) {
  return function IndexPatternFactory(Private, timefilter, Notifier, config, kbnIndex, Promise, $rootScope, safeConfirm) {
    let _ = require('lodash');
    let errors = require('ui/errors');
    let angular = require('angular');

    let fieldformats = Private(require('ui/registry/field_formats'));
    let getIds = Private(require('ui/index_patterns/_get_ids'));
    let mapper = Private(require('ui/index_patterns/_mapper'));
    let intervals = Private(require('ui/index_patterns/_intervals'));
    let getComputedFields = require('ui/index_patterns/_get_computed_fields');
    let DocSource = Private(require('ui/courier/data_source/doc_source'));
    let mappingSetup = Private(require('ui/utils/mapping_setup'));
    let FieldList = Private(require('ui/index_patterns/_field_list'));

    let flattenHit = Private(require('ui/index_patterns/_flatten_hit'));
    let formatHit = require('ui/index_patterns/_format_hit');
    let calculateIndices = Private(require('ui/index_patterns/_calculate_indices'));
    let patternCache = Private(require('ui/index_patterns/_pattern_cache'));

    let type = 'index-pattern';

    let notify = new Notifier();

    let mapping = mappingSetup.expandShorthand({
      title: 'string',
      timeFieldName: 'string',
      notExpandable: 'boolean',
      intervalName: 'string',
      fields: 'json',
      fieldFormatMap: {
        type: 'string',
        _serialize: function (map) {
          if (map == null) return;

          let count = 0;
          let serialized = _.transform(map, function (flat, format, field) {
            if (!format) return;
            count++;
            flat[field] = format;
          });

          if (count) return angular.toJson(serialized);
        },
        _deserialize: function (map) {
          if (map == null) return {};
          return _.mapValues(angular.fromJson(map), function (mapping) {
            let FieldFormat = fieldformats.byId[mapping.id];
            return FieldFormat && new FieldFormat(mapping.params);
          });
        }
      }
    });

    function IndexPattern(id) {
      let self = this;

      setId(id);

      let docSource = new DocSource();

      self.init = function () {
        // tell the docSource where to find the doc
        docSource
        .index(kbnIndex)
        .type(type)
        .id(self.id);

        // listen for config changes and update field list
        $rootScope.$on('change:config', function () {
          initFields();
        });

        return mappingSetup.isDefined(type)
        .then(function (defined) {
          // create mapping for this type if one does not exist
          if (defined) return true;
          return mappingSetup.setup(type, mapping);
        })
        .then(function () {
          // If there is no id, then there is no document to fetch from elasticsearch
          if (!self.id) return;

          // fetch the object from ES
          return docSource.fetch()
          .then(function applyESResp(resp) {
            if (!resp.found) throw new errors.SavedObjectNotFound(type, self.id);

            // deserialize any json fields
            _.forOwn(mapping, function ittr(fieldMapping, name) {
              if (fieldMapping._deserialize) {
                resp._source[name] = fieldMapping._deserialize(resp._source[name], resp, name, fieldMapping);
              }
            });

            // Give obj all of the values in _source
            _.assign(self, resp._source);

            self._indexFields();

            // Any time obj is updated, re-call applyESResp
            docSource.onUpdate().then(applyESResp, notify.fatal);
          });
        })
        .then(function () {
          // return our obj as the result of init()
          return self;
        });
      };

      function initFields(fields) {
        self.fields = new FieldList(self, fields || self.fields || []);
      }

      self._indexFields = function () {
        if (self.id) {
          if (!self.fields) {
            return self.refreshFields();
          } else {
            initFields();
          }
        }
      };

      self.addScriptedField = function (name, script, type, lang) {
        type = type || 'string';

        let scriptFields = _.pluck(self.getScriptedFields(), 'name');

        if (_.contains(scriptFields, name)) {
          throw new errors.DuplicateField(name);
        }

        self.fields.push({
          name: name,
          script: script,
          type: type,
          scripted: true,
          lang: lang
        });

        self.save();
      };

      self.removeScriptedField = function (name) {
        let fieldIndex = _.findIndex(self.fields, {
          name: name,
          scripted: true
        });

        self.fields.splice(fieldIndex, 1);

        self.save();
      };

      self.popularizeField = function (fieldName, unit) {
        if (unit == null) unit = 1;

        let field = _.get(self, ['fields', 'byName', fieldName]);
        if (!field) return;

        let count = Math.max((field.count || 0) + unit, 0);
        if (field.count !== count) {
          field.count = count;
          self.save();
        }
      };

      self.getNonScriptedFields = function () {
        return _.where(self.fields, { scripted: false });
      };

      self.getScriptedFields = function () {
        return _.where(self.fields, { scripted: true });
      };

      self.getInterval = function () {
        return this.intervalName && _.find(intervals, { name: this.intervalName });
      };

      self.toIndexList = function (start, stop, sortDirection) {
        return self
        .toDetailedIndexList(start, stop, sortDirection)
        .then(function (detailedIndices) {
          if (!_.isArray(detailedIndices)) {
            return detailedIndices.index;
          }

          return _.pluck(detailedIndices, 'index');
        });
      };

      self.toDetailedIndexList = Promise.method(function (start, stop, sortDirection) {
        let interval = self.getInterval();

        if (interval) {
          return intervals.toIndexList(self.id, interval, start, stop, sortDirection);
        }

        if (self.isWildcard() && self.hasTimeField() && self.canExpandIndices()) {
          return calculateIndices(self.id, self.timeFieldName, start, stop, sortDirection);
        }

        return {
          index: self.id,
          min: -Infinity,
          max: Infinity,
        };
      });

      self.canExpandIndices = function () {
        return !this.notExpandable;
      };

      self.hasTimeField = function () {
        return !!(this.timeFieldName && this.fields.byName[this.timeFieldName]);
      };

      self.isWildcard = function () {
        return _.includes(this.id, '*');
      };

      self.prepBody = function () {
        let body = {};

        // serialize json fields
        _.forOwn(mapping, function (fieldMapping, fieldName) {
          if (self[fieldName] != null) {
            body[fieldName] = (fieldMapping._serialize)
              ? fieldMapping._serialize(self[fieldName])
              : self[fieldName];
          }
        });

        // ensure that the docSource has the current self.id
        docSource.id(self.id);

        // clear the indexPattern list cache
        getIds.clearCache();
        return body;
      };

      function setId(id) {
        return self.id = id;
      }

      self.create = function () {
        let body = self.prepBody();
        return docSource.doCreate(body)
        .then(setId)
        .catch(function (err) {
          if (_.get(err, 'origError.status') === 409) {
            let confirmMessage = 'Are you sure you want to overwrite this?';

            return safeConfirm(confirmMessage).then(
              function () {
                return Promise.try(function () {
                  const cached = patternCache.get(self.id);
                  if (cached) {
                    return cached.then(pattern => pattern.destroy());
                  }
                })
                .then(() => docSource.doIndex(body))
                .then(setId);
              },
              _.constant(false) // if the user doesn't overwrite, resolve with false
            );
          }
          return Promise.resolve(false);
        });
      };

      self.save = function () {
        let body = self.prepBody();
        return docSource.doIndex(body).then(setId);
      };

      self.refreshFields = function () {
        return mapper.clearCache(self)
        .then(self._fetchFields)
        .then(self.save);
      };

      self._fetchFields = function () {
        return mapper.getFieldsForIndexPattern(self, true)
        .then(function (fields) {
          // append existing scripted fields
          fields = fields.concat(self.getScriptedFields());

          // initialize self.field with this field list
          initFields(fields);
        });
      };

      self.toJSON = function () {
        return self.id;
      };

      self.toString = function () {
        return '' + self.toJSON();
      };

      self.destroy = function () {
        patternCache.clear(self.id);
        docSource.destroy();
      };

      self.metaFields = config.get('metaFields');
      self.getComputedFields = getComputedFields.bind(self);

      self.flattenHit = flattenHit(self);
      self.formatHit = formatHit(self, fieldformats.getDefaultInstance('string'));
      self.formatField = self.formatHit.formatField;
    }

    IndexPattern.prototype.routes = {
      edit: '/settings/indices/{{id}}',
      addField: '/settings/indices/{{id}}/create-field',
      indexedFields: '/settings/indices/{{id}}?_a=(tab:indexedFields)',
      scriptedFields: '/settings/indices/{{id}}?_a=(tab:scriptedFields)'
    };

    return IndexPattern;
  };
});
