/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { StoredRefreshInterval } from '../../server/saved_objects/types';
import type { MapAttributes, StoredMapAttributes } from '../../server';
import { extractReferences } from '../migrations/references';
import { convertSnakeCasedKeysToCamelCase } from './convert_snake_cased_keys_to_camel_case';
import { mapStateKeys, uiStateKeys } from './stored_map_attributes';

// Query state contains Elasticsearch DSL. Keys must be persisted as provided.
const SKIP_CAMEL_CASE_KEYS = ['query', 'whereQuery'];

export function transformMapAttributesIn(mapState: MapAttributes): {
  attributes: StoredMapAttributes;
  references: Reference[];
} {
  const storedMapAttributes: StoredMapAttributes = {
    title: mapState.title,
  };

  if (mapState.description) storedMapAttributes.description = mapState.description;
  if (mapState.layers)
    storedMapAttributes.layerListJSON = JSON.stringify(
      convertSnakeCasedKeysToCamelCase(mapState.layers, SKIP_CAMEL_CASE_KEYS)
    );

  const mapStateJSON = getJSONString(
    {
      ...mapState,
      ...(mapState.refreshInterval
        ? {
            refreshConfig: {
              isPaused: mapState.refreshInterval.pause,
              interval: mapState.refreshInterval.value,
            } as StoredRefreshInterval,
          }
        : {}),
    },
    mapStateKeys
  );
  if (mapStateJSON) storedMapAttributes.mapStateJSON = mapStateJSON;

  const uiStateJSON = getJSONString(mapState, uiStateKeys);
  if (uiStateJSON) storedMapAttributes.uiStateJSON = uiStateJSON;
  return extractReferences({ attributes: storedMapAttributes });
}

function getJSONString(mapState: Record<string, unknown>, keys: string[]) {
  const selectedState: Record<string, unknown> = {};
  keys.forEach((key) => {
    if (key in mapState) {
      selectedState[key] = mapState[key];
    }
  });
  return Object.keys(selectedState).length ? JSON.stringify(selectedState) : undefined;
}
