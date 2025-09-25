/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { MapAttributes, StoredMapAttributes } from '../../server';
import { extractReferences } from '../migrations/references';

export function transformMapAttributesIn(mapState: MapAttributes): {
  attributes: StoredMapAttributes;
  references: Reference[];
} {
  const storedMapAttributes: StoredMapAttributes = {
    title: mapState.title,
  };

  if (mapState.description) storedMapAttributes.description = mapState.description;
  if (mapState.layers) storedMapAttributes.layerListJSON = JSON.stringify(mapState.layers);
  if (mapState.mapStateJSON) storedMapAttributes.mapStateJSON = mapState.mapStateJSON;

  const uiStateJSON = getUiStateJSON(mapState);
  if (uiStateJSON) storedMapAttributes.uiStateJSON = uiStateJSON;
  return extractReferences({ attributes: storedMapAttributes });
}

function getUiStateJSON(mapState: MapAttributes) {
  const uiState: Record<string, unknown> = {};
  if ('isLayerTOCOpen' in mapState) {
    uiState.isLayerTOCOpen = mapState.isLayerTOCOpen;
  }
  if ('openTOCDetails' in mapState) {
    uiState.openTOCDetails = mapState.openTOCDetails;
  }
  return Object.keys(uiState).length ? JSON.stringify(uiState) : undefined;
}
