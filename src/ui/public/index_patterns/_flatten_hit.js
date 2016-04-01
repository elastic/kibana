// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  return function FlattenHitProvider(config, $rootScope) {
    let _ = require('lodash');

    let metaFields = config.get('metaFields');
    $rootScope.$on('change:config.metaFields', function () {
      metaFields = config.get('metaFields');
    });

    function flattenHit(indexPattern, hit) {
      let flat = {};

      // recursively merge _source
      let fields = indexPattern.fields.byName;
      (function flatten(obj, keyPrefix) {
        keyPrefix = keyPrefix ? keyPrefix + '.' : '';
        _.forOwn(obj, function (val, key) {
          key = keyPrefix + key;

          if (flat[key] !== void 0) return;

          let hasValidMapping = (fields[key] && fields[key].type !== 'conflict');
          let isValue = !_.isPlainObject(val);

          if (hasValidMapping || isValue) {
            flat[key] = val;
            return;
          }

          flatten(val, key);
        });
      }(hit._source));

      // assign the meta fields
      _.each(metaFields, function (meta) {
        if (meta === '_source') return;
        flat[meta] = hit[meta];
      });

      // unwrap computed fields
      _.forOwn(hit.fields, function (val, key) {
        if (key[0] === '_' && !_.contains(metaFields, key)) return;
        flat[key] = _.isArray(val) && val.length === 1 ? val[0] : val;
      });

      return flat;
    }

    return function (indexPattern) {
      function cachedFlatten(hit) {
        return hit.$$_flattened || (hit.$$_flattened = flattenHit(indexPattern, hit));
      }

      cachedFlatten.uncached = _.partial(flattenHit, indexPattern);

      return cachedFlatten;
    };
  };

});
