/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexPatternService } from './kibana_services';

export async function getIndexPatternsFromIds(indexPatternIds = []) {
  const promises = [];
  indexPatternIds.forEach(id => {
    const indexPatternPromise = indexPatternService.get(id);
    if (indexPatternPromise) {
      promises.push(indexPatternPromise);
    }
  });

  return await Promise.all(promises);
}

export function getTermsFields(fields) {
  return fields.filter(field => {
    return field.aggregatable && ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type);
  });
}

// Returns filtered fields list containing only fields that exist in _source.
export function getSourceFields(fields) {
  return fields.filter(field => {
    // Multi fields are not stored in _source and only exist in index.
    return field.subType !== 'multi';
  });
}
