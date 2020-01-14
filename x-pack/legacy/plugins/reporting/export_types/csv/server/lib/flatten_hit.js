/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

// TODO this logic should be re-used with Discover
export function createFlattenHit(fields, metaFields, conflictedTypesFields) {
  const flattenSource = (flat, obj, keyPrefix) => {
    keyPrefix = keyPrefix ? keyPrefix + '.' : '';
    _.forOwn(obj, (val, key) => {
      key = keyPrefix + key;

      const hasValidMapping = fields.indexOf(key) >= 0 && conflictedTypesFields.indexOf(key) === -1;
      const isValue = !_.isPlainObject(val);

      if (hasValidMapping || isValue) {
        if (!flat[key]) {
          flat[key] = val;
        } else if (_.isArray(flat[key])) {
          flat[key].push(val);
        } else {
          flat[key] = [flat[key], val];
        }
        return;
      }

      flattenSource(flat, val, key);
    });
  };

  const flattenMetaFields = (flat, hit) => {
    _.each(metaFields, meta => {
      if (meta === '_source') return;
      flat[meta] = hit[meta];
    });
  };

  const flattenFields = (flat, hitFields) => {
    _.forOwn(hitFields, (val, key) => {
      if (key[0] === '_' && !_.contains(metaFields, key)) return;
      flat[key] = _.isArray(val) && val.length === 1 ? val[0] : val;
    });
  };

  return function flattenHit(hit) {
    const flat = {};
    flattenSource(flat, hit._source);
    flattenMetaFields(flat, hit);
    flattenFields(flat, hit.fields);
    return flat;
  };
}
