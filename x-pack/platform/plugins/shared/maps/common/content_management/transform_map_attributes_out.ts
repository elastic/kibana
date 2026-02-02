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
import { mapStateKeys, uiStateKeys } from './stored_map_attributes';
import type { StoredRefreshInterval } from '../../server/saved_objects/types';
import { transformLayersOut } from './transform_layers_out';

export function transformMapAttributesOut(
  storedMapAttributes: StoredMapAttributes,
  findReference: (name: string) => Reference | undefined
): MapAttributes {
  const { attributes: injectedAttributes } = injectReferences({
    attributes: storedMapAttributes,
    findReference,
  });
  return {
    title: injectedAttributes.title,
    ...(injectedAttributes.description ? { description: injectedAttributes.description } : {}),
    ...parseLayerListJSON(injectedAttributes.layerListJSON),
    ...parseMapStateJSON(injectedAttributes.mapStateJSON),
    ...parseUiStateJSON(injectedAttributes.uiStateJSON),
  };
}

function parseLayerListJSON(layerListJSON?: string) {
  if (!layerListJSON) return {};

  const layers = parseJSON<Partial<LayerDescriptor[]>>([], layerListJSON);
  return { layers: transformLayersOut(layers) };
}

function parseMapStateJSON(mapStateJSON?: string) {
  const parsedMapState = parseJSON<{ [key: string]: unknown }>({}, mapStateJSON);
  const { refreshConfig, ...rest } = dropUnknownKeys(
    parsedMapState,
    mapStateKeys
  ) as Partial<MapAttributes> & { refreshConfig: StoredRefreshInterval };
  return {
    ...rest,
    ...(refreshConfig
      ? { refreshInterval: { pause: refreshConfig.isPaused, value: refreshConfig.interval } }
      : {}),
  };
}

function parseUiStateJSON(uiStateJSON?: string) {
  const parsedUiState = parseJSON<{ [key: string]: unknown }>({}, uiStateJSON);
  return dropUnknownKeys(parsedUiState, uiStateKeys);
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

function dropUnknownKeys(value: { [key: string]: unknown }, knownKeys: string[]) {
  const valueWithKnownKeys: { [key: string]: unknown } = {};
  Object.keys(value).forEach((keyFromValue) => {
    if (knownKeys.includes(keyFromValue)) valueWithKnownKeys[keyFromValue] = value[keyFromValue];
  });
  return valueWithKnownKeys;
}
