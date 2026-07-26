/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';

export const getReferencesForElement = (
  references: SavedObjectReference[],
  elementId: string
): SavedObjectReference[] =>
  references
    .filter(({ name }) => name.startsWith(`${elementId}:`))
    .map(({ name, ...rest }) => ({
      ...rest,
      name: name.replace(`${elementId}:`, '').replace(/l\d+_/, ''), // Removes the element ID prefix and subsequently the link number prefix added by the expression service
    }));
