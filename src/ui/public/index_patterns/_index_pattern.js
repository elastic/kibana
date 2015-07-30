define(function (require) {
  return function IndexPatternFactory(Private, timefilter, Notifier, config, kbnIndex, Promise, $rootScope) {
    var _ = require('lodash');
    var errors = require('ui/errors');
    var angular = require('angular');

    var fieldformats = Private(require('ui/registry/field_formats'));
    var getIds = Private(require('ui/index_patterns/_get_ids'));
    var mapper = Private(require('ui/index_patterns/_mapper'));
    var intervals = Private(require('ui/index_patterns/_intervals'));
    var getComputedFields = require('ui/index_patterns/_get_computed_fields');
    var DocSource = Private(require('ui/courier/data_source/doc_source'));
    var mappingSetup = Private(require('ui/utils/mapping_setup'));
    var FieldList = Private(require('ui/index_patterns/_field_list'));

    var flattenHit = Private(require('ui/index_patterns/_flatten_hit'));
    var formatHit = require('ui/index_patterns/_format_hit');

    var type = 'index-pattern';

    var notify = new Notifier();

    var mapping = mappingSetup.expandShorthand({
      title: 'string',
      timeFieldName: 'string',
      intervalName: 'string',
      fields: 'json',
      fieldFormatMap: {
        type: 'string',
        _serialize: function (map) {
          if (map == null) return;

          var count = 0;
          var serialized = _.transform(map, function (flat, format, field) {
            if (!format) return;
            count++;
            flat[field] = format;
          });

          if (count) return angular.toJson(serialized);
        },
        _deserialize: function (map) {
          if (map == null) return {};
          return _.mapValues(angular.fromJson(map), function (mapping) {
            var FieldFormat = fieldformats.byId[mapping.id];
            return FieldFormat && new FieldFormat(mapping.params);
          });
        }
      }
    });

    function IndexPattern(id) {
      var self = this;

      setId(id);

      var docSource = new DocSource();

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

        var scriptFields = _.pluck(self.getScriptedFields(), 'name');

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
        var fieldIndex = _.findIndex(self.fields, {
          name: name,
          scripted: true
        });

        self.fields.splice(fieldIndex, 1);

        self.save();
      };

      self.popularizeField = function (fieldName, unit) {
        if (unit == null) unit = 1;

        var field = _.get(self, ['fields', 'byName', fieldName]);
        if (!field) return;

        var count = Math.max((field.count || 0) + unit, 0);
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

      self.toIndexList = function (start, stop) {
        var interval = this.getInterval();
        if (interval) {
          return intervals.toIndexList(self.id, interval, start, stop);
        } else {
          return self.id;
        }
      };

      self.prepBody = function () {
        var body = {};

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
        var body = self.prepBody();
        return docSource.doCreate(body)
        .then(setId)
        .catch(function (err) {
          var confirmMessage = 'Are you sure you want to overwrite this?';
          if (_.get(err, 'origError.status') === 409 && window.confirm(confirmMessage)) {
            return docSource.doIndex(body).then(setId);
          }
          return Promise.resolve(false);
        });
      };

      self.save = function () {
        var body = self.prepBody();
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
