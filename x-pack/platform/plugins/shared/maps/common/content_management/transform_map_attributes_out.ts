/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { MapAttributes, StoredMapAttributes } from '../../server';
import { injectReferences } from '../migrations/references';
import type { LayerDescriptor } from '../descriptor_types';

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
    ...(injectedAttributes.description ? { description: injectedAttributes.description } : {}),
    ...(injectedAttributes.layerListJSON
      ? { layers: parseJSON<Partial<LayerDescriptor[]>>([], injectedAttributes.layerListJSON) }
      : {}),
    ...parseMapStateJSON(injectedAttributes.mapStateJSON),
    ...parseJSON<Partial<MapAttributes>>({}, injectedAttributes.uiStateJSON),
  };
}

function parseMapStateJSON(mapStateJSON?: string) {
  const { refreshConfig, ...rest } = parseJSON<Partial<MapAttributes>>({}, mapStateJSON);
  return {
    ...rest,
    ...(refreshConfig
      ? { refreshInterval: { pause: refreshConfig.isPaused, value: refreshConfig.interval } }
      : {}),
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
