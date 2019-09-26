/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNestedProperty } from '../../util/object_utils';

export type EsId = string;
export type EsDocSource = Record<string, any>;
export type EsFieldName = string;

export interface EsDoc extends Record<string, any> {
  _id: EsId;
  _source: EsDocSource;
}

export const MAX_COLUMNS = 20;

const ML__ID_COPY = 'ml__id_copy';

// Used to sort columns:
// - string based columns are moved to the left
// - followed by the outlier_score column
// - feature_influence fields get moved next to the corresponding field column
// - overall fields get sorted alphabetically
export const sortColumns = (obj: EsDocSource, resultsField: string) => (a: string, b: string) => {
  const typeofA = typeof obj[a];
  const typeofB = typeof obj[b];

  if (typeofA !== 'string' && typeofB === 'string') {
    return 1;
  }
  if (typeofA === 'string' && typeofB !== 'string') {
    return -1;
  }
  if (typeofA === 'string' && typeofB === 'string') {
    return a.localeCompare(b);
  }

  if (a === `${resultsField}.outlier_score`) {
    return -1;
  }

  if (b === `${resultsField}.outlier_score`) {
    return 1;
  }

  const tokensA = a.split('.');
  const prefixA = tokensA[0];
  const tokensB = b.split('.');
  const prefixB = tokensB[0];

  if (prefixA === resultsField && tokensA.length > 1 && prefixB !== resultsField) {
    tokensA.shift();
    tokensA.shift();
    if (tokensA.join('.') === b) return 1;
    return tokensA.join('.').localeCompare(b);
  }

  if (prefixB === resultsField && tokensB.length > 1 && prefixA !== resultsField) {
    tokensB.shift();
    tokensB.shift();
    if (tokensB.join('.') === a) return -1;
    return a.localeCompare(tokensB.join('.'));
  }

  return a.localeCompare(b);
};

export function getFlattenedFields(obj: EsDocSource, resultsField: string): EsFieldName[] {
  const flatDocFields: EsFieldName[] = [];
  const newDocFields = Object.keys(obj);
  newDocFields.forEach(f => {
    const fieldValue = getNestedProperty(obj, f);
    if (typeof fieldValue !== 'object' || fieldValue === null || Array.isArray(fieldValue)) {
      flatDocFields.push(f);
    } else {
      const innerFields = getFlattenedFields(fieldValue, resultsField);
      const flattenedFields = innerFields.map(d => `${f}.${d}`);
      flatDocFields.push(...flattenedFields);
    }
  });
  return flatDocFields.filter(f => f !== ML__ID_COPY);
}

export const getDefaultSelectableFields = (docs: EsDoc[], resultsField: string): EsFieldName[] => {
  if (docs.length === 0) {
    return [];
  }

  const newDocFields = getFlattenedFields(docs[0]._source, resultsField);
  return newDocFields
    .filter(k => {
      if (k === `${resultsField}.outlier_score`) {
        return true;
      }
      if (k.split('.')[0] === resultsField) {
        return false;
      }

      let value = false;
      docs.forEach(row => {
        const source = row._source;
        if (source[k] !== null) {
          value = true;
        }
      });
      return value;
    })
    .slice(0, MAX_COLUMNS);
};

export const toggleSelectedField = (
  selectedFields: EsFieldName[],
  column: EsFieldName
): EsFieldName[] => {
  const index = selectedFields.indexOf(column);
  if (index === -1) {
    selectedFields.push(column);
  } else {
    selectedFields.splice(index, 1);
  }
  return selectedFields;
};
