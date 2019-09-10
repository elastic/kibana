/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function normalizeType(type) {
  const normalTypes = {
    string: ['string', 'text', 'keyword', '_type', '_id', '_index', 'geo_point'],
    number: [
      'float',
      'half_float',
      'scaled_float',
      'double',
      'integer',
      'long',
      'short',
      'byte',
      'token_count',
      '_version',
    ],
    date: ['date', 'datetime'],
    boolean: ['boolean'],
    null: ['null'],
  };

  const normalizedType = Object.keys(normalTypes).find(t => normalTypes[t].includes(type));

  if (normalizedType) {
    return normalizedType;
  }
  throw new Error(`Canvas does not yet support type: ${type}`);
}
