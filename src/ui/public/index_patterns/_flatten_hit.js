import _ from 'lodash';

// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
export default function FlattenHitProvider(config) {
  let metaFields = config.get('metaFields');

  config.watch('metaFields', value => {
    metaFields = value;
  });

  function flattenHit(indexPattern, hit, deep) {
    const flat = {};

    // recursively merge _source
    const fields = indexPattern.fields.byName;
    (function flatten(obj, keyPrefix, prefixStore) {
      keyPrefix = keyPrefix ? keyPrefix + '.' : '';
      _.forOwn(obj, function (val, key) {
        key = keyPrefix + key;

        if (deep) {
          const isNestedField = fields[key] && fields[key].type === 'nested';
          const isArrayOfObjects = _.isArray(val) && _.isPlainObject(_.first(val));
          if (isArrayOfObjects && !isNestedField) {
            _.each(val, v => flatten(v, key));
            return;
          }
        } else if (flat[key] !== void 0) {
          return;
        }

        const hasValidMapping = fields[key] && fields[key].type !== 'conflict';
        const isValue = !_.isPlainObject(val);

        if (hasValidMapping === undefined && val && val.constructor === Array) {
          const pArr = [];
          _.forEach(val, function (item) {
            const pStore = {};
            flatten(item, key, pStore);
            pArr.push(pStore);
          });
          val = pArr;
        }

        if (hasValidMapping || isValue) {
          if (prefixStore) {
            prefixStore[key] = val;
          } else if (!flat[key]) {
            flat[key] = val;
          } else if (_.isArray(flat[key])) {
            flat[key].push(val);
          } else {
            flat[key] = [ flat[key], val ];
          }
          return;
        }

        flatten(val, key, prefixStore);
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

  return function flattenHitWrapper(indexPattern) {
    return function cachedFlatten(hit, deep = false) {
      return hit.$$_flattened || (hit.$$_flattened = flattenHit(indexPattern, hit, deep));
    };
  };
}
