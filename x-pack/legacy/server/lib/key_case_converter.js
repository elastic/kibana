/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

// Note: This function uses _.clone. This will clone objects created by constructors other than Object
// to plain Object objects. Uncloneable values such as functions, DOM nodes, Maps, Sets, and WeakMaps
// will be cloned to the empty object.
function convertKeysToSpecifiedCaseDeep(object, caseConversionFunction) {
  // Base case
  if (!(_.isPlainObject(object) || _.isArray(object))) {
    return object;
  }

  // Clone (so we don't modify the original object that was passed in)
  let newObject;
  if (Array.isArray(object)) {
    newObject = object.slice(0);
  } else {
    newObject = _.clone(object);

    // Convert top-level keys
    newObject = _.mapKeys(newObject, (value, key) => caseConversionFunction(key)); // eslint-disable-line no-unused-vars
  }

  // Recursively convert nested object keys
  _.forEach(
    newObject,
    (value, key) => (newObject[key] = convertKeysToSpecifiedCaseDeep(value, caseConversionFunction))
  );

  return newObject;
}

function validateObject(object) {
  if (!(_.isPlainObject(object) || _.isArray(object))) {
    throw new Error('Specified object should be an Object or Array');
  }
}

export function convertKeysToSnakeCaseDeep(object) {
  validateObject(object);
  return convertKeysToSpecifiedCaseDeep(object, _.snakeCase);
}

export function convertKeysToCamelCaseDeep(object) {
  validateObject(object);
  return convertKeysToSpecifiedCaseDeep(object, _.camelCase);
}
