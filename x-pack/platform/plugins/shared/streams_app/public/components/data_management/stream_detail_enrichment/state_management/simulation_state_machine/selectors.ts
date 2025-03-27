/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { SampleDocument } from '@kbn/streams-schema';
import { SimulationContext } from './types';

/**
 * Selects the set of dotted fields that are not supported by the current simulation.
 */
export const selectUnsupportedDottedFields = createSelector(
  [(context: SimulationContext) => context.samples],
  (samples) => {
    const properties = samples.flatMap(getFlattenedDottedProperties);

    return new Set(properties);
  }
);

/**
 * Returns a list of all dotted properties in the given object.
 */
function getFlattenedDottedProperties(obj: SampleDocument): string[] {
  const result: string[] = [];

  function traverse(currentObj: SampleDocument, path: string[], hasDot: boolean) {
    for (const key in currentObj) {
      if (Object.hasOwn(currentObj, key)) {
        const newPath = [...path, key];
        const currentHasDot = hasDot || key.includes('.');
        const value = currentObj[key];

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          traverse(value, newPath, currentHasDot);
        } else if (currentHasDot) {
          result.push(newPath.join('.'));
        }
      }
    }
  }

  traverse(obj, [], false);
  return result;
}
