/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { SampleDocument } from '@kbn/streams-schema';
import { isPlainObject, uniq } from 'lodash';
import { SimulationContext } from './types';

/**
 * Selects the set of dotted fields that are not supported by the current simulation.
 */
export const selectUnsupportedDottedFields = createSelector(
  [(context: SimulationContext) => context.samples],
  (samples) => {
    const properties = samples.flatMap(getDottedFieldPrefixes);

    return uniq(properties);
  }
);

const isPlainObj = isPlainObject as (value: unknown) => value is Record<string, unknown>;

/**
 * Returns a list of all dotted properties prefixes in the given object.
 */
function getDottedFieldPrefixes(obj: SampleDocument): string[] {
  const result: string[] = [];

  function traverse(currentObj: SampleDocument, path: string[]): boolean {
    let foundDot = false;

    for (const key in currentObj) {
      if (Object.hasOwn(currentObj, key)) {
        const value = currentObj[key];
        const newPath = [...path, key];

        // Check if current key contains a dot
        if (key.includes('.')) {
          const newKey = newPath.join('.');
          // For objects with dotted keys, add trailing dot
          if (isPlainObj(value)) {
            result.push(newKey.concat('.'));
          } else {
            result.push(newKey);
          }
          foundDot = true;
          continue; // Skip further traversal for this key
        }

        // If it's an object, traverse deeper
        if (isPlainObj(value) && traverse(value, newPath)) {
          // If traversal found a dot, don't continue with siblings
          foundDot = true;
          continue;
        }
      }
    }

    return foundDot;
  }

  traverse(obj, []);

  return result;
}
