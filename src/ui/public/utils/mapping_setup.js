import angular from 'angular';
import _ from 'lodash';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

define(function () {
  return function MappingSetupService(kbnIndex, Private) {
    const mappingSetup = this;
    const savedObjectsClient = Private(SavedObjectsClientProvider);

    const json = {
      _serialize: function (val) {
        if (val != null) return angular.toJson(val);
      },
      _deserialize: function (val) {
        if (val != null) return JSON.parse(val);
      }
    };

    /**
     * Use to create the mappings, but that should only happen one at a time
     */
    const activeTypeCreations = {};

    /**
     * Get the list of type's mapped in elasticsearch
     * @return {[type]} [description]
     */
    const getKnownKibanaTypes = _.once(function () {
      return savedObjectsClient.getDefinedTypes();
    });

    mappingSetup.expandShorthand = function (sh) {
      return _.mapValues(sh || {}, function (val) {
        // allow shortcuts for the field types, by just setting the value
        // to the type name
        if (typeof val === 'string') val = { type: val };

        if (val.type === 'json') {
          val.type = 'text';
          val._serialize = json._serialize;
          val._deserialize = json._deserialize;
        }

        return val;
      });
    };

    mappingSetup.isDefined = function (type) {
      return getKnownKibanaTypes()
      .then(function (knownTypes) {
        // if the type is in the knownTypes array already
        return !!(~knownTypes.indexOf(type));
      });
    };

    mappingSetup.setup = function (type, mapping) {
      // if there is already a creation running for this index type
      if (activeTypeCreations[type]) {
        // return a promise that will reexecute the setup once the
        // current is complete.
        return activeTypeCreations[type].then(function () {
          return mappingSetup.setup(type, mapping);
        });
      }

      const prom = getKnownKibanaTypes()
      .then(function (knownTypes) {
        // if the type is in the knownTypes array already
        if (~knownTypes.indexOf(type)) return false;
        return savedObjectsClient.defineType(type, mapping)
        .then(() => {
          knownTypes.push(type);
          return true;
        });
      })
      // wether this fails or not, remove it from the activeTypeCreations obj
      // once complete
      .finally(function () {
        delete activeTypeCreations[type];
      });

      activeTypeCreations[type] = prom;
      return prom;
    };
  };

});
