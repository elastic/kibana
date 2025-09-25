/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { MapAttributes, StoredMapAttributes } from '../../server';
import { injectReferences } from '../migrations/references';

export function transformMapAttributesOut(
  storedMapAttributes: StoredMapAttributes,
  references: Reference[]
): MapAttributes {
  const { attributes: injectedAttributes } = injectReferences({
    attributes: storedMapAttributes,
    references,
  });
  return {
    title: injectedAttributes.title,
    ...parseJSON<Partial<MapAttributes>>({}, injectedAttributes.uiStateJSON),
  };
}

function parseJSON<ReturnType>(emptyValue: ReturnType, jsonString?: string) {
  if (!jsonString) return emptyValue;
  try {
    const parseResults = JSON.parse(jsonString);
    return parseResults;
  } catch (e) {
    // ignore malformed JSON, map will just use defaults
    return emptyValue;
  }
}
