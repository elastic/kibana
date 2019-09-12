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

export const addEntitiesToKql = (
  entityNames: string[],
  entities: string[],
  kqlQuery: string
): string => {
  const value: RisonValue = decodeRison(kqlQuery);
  if (isRisonObject(value)) {
    const filterQuery = value.filterQuery;
    if (isRisonObject(filterQuery)) {
      if (isRegularString(filterQuery.expression)) {
        const entitiesKql = entitiesToKql(entityNames, entities);
        if (filterQuery.expression !== '' && entitiesKql !== '') {
          filterQuery.expression = `(${entitiesKql}) and (${filterQuery.expression})`;
        } else if (filterQuery.expression === '' && entitiesKql !== '') {
          filterQuery.expression = `(${entitiesKql})`;
        }
        return encode(value);
      }
    } else if (value.filterQuery == null) {
      const entitiesKql = entitiesToKql(entityNames, entities);
      value.filterQuery = { expression: `(${entitiesKql})` };
      return encode(value);
    }
  }
  return kqlQuery;
};
