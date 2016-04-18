define(function () {
  return function MappingSetupService(kbnIndex, es) {
    let angular = require('angular');
    let _ = require('lodash');
    let mappingSetup = this;

    let json = {
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
    let activeTypeCreations = {};

    /**
     * Get the list of type's mapped in elasticsearch
     * @return {[type]} [description]
     */
    let getKnownKibanaTypes = _.once(function () {
      let indexName = kbnIndex;
      return es.indices.getFieldMapping({
        // only concerned with types in this kibana index
        index: indexName,
        // check all types
        type: '*',
        // limit the response to just the _source field for each index
        field: '_source'
      }).then(function (resp) {
        return _.keys(resp[indexName].mappings);
      });
    });

    mappingSetup.expandShorthand = function (sh) {
      return _.mapValues(sh || {}, function (val, prop) {
        // allow shortcuts for the field types, by just setting the value
        // to the type name
        if (typeof val === 'string') val = { type: val };

        if (val.type === 'json') {
          val.type = 'string';
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

      let prom = getKnownKibanaTypes()
      .then(function (knownTypes) {
        // if the type is in the knownTypes array already
        if (~knownTypes.indexOf(type)) return false;

        // we need to create the mapping
        let body = {};
        body[type] = {
          properties: mapping
        };

        return es.indices.putMapping({
          index: kbnIndex,
          type: type,
          body: body
        }).then(function (resp) {
          // add this type to the list of knownTypes
          knownTypes.push(type);

          // cast the response to "true", meaning
          // the mapping exists
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
