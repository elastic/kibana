/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

export const entityToKql = (entityNames: string[], entity: string): string => {
  if (entityNames.length === 1) {
    return `${entityNames[0]}: "${entity}"`;
  } else {
    return entityNames.reduce((accum, entityName, index, array) => {
      if (index === 0) {
        return `(${entityName}: "${entity}"`;
      } else if (index === array.length - 1) {
        return `${accum} or ${entityName}: "${entity}")`;
      } else {
        return `${accum} or ${entityName}: "${entity}"`;
      }
    }, '');
  }
};

export const entitiesToKql = (entityNames: string[], entities: string[]): string => {
  return entities.reduce((accum, entity, index) => {
    const entityKql = entityToKql(entityNames, entity);
    if (index === 0) {
      return entityKql;
    } else {
      return `${accum} or ${entityKql}`;
    }
  }, '');
};

export const emptyKql = {
  filterQuery: {
    expression: '',
  },
  kind: 'kuery',
};

export const decodeKqlQueryOrInitialize = (kqlQuery: string | null): RisonValue => {
  if (kqlQuery == null) {
    return emptyKql;
  } else {
    return decodeRison(kqlQuery);
  }
};

export const addEntitiesToKql = (
  entityNames: string[],
  entities: string[],
  kqlQuery: string | null
): string => {
  const value: RisonValue = decodeKqlQueryOrInitialize(kqlQuery);
  if (isRisonObject(value)) {
    const filterQuery = value.filterQuery;
    if (isRisonObject(filterQuery)) {
      if (isRegularString(filterQuery.expression)) {
        const entitiesKql = entitiesToKql(entityNames, entities);
        if (filterQuery.expression !== '') {
          filterQuery.expression = `(${entitiesKql}) and (${filterQuery.expression})`;
        } else {
          filterQuery.expression = `(${entitiesKql})`;
        }
        return encode(value);
      }
    }
  }
  if (kqlQuery == null) {
    return '';
  } else {
    return kqlQuery;
  }
};
