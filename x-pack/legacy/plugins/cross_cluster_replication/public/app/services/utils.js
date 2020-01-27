/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const objectToArray = obj => Object.keys(obj).map(k => ({ ...obj[k], __id__: k }));

export const arrayToObject = (array, keyProp = 'id') =>
  array.reduce((acc, item) => {
    acc[item[keyProp]] = item;
    return acc;
  }, {});
