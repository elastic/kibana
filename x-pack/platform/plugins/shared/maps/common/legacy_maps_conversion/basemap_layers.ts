/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isPlainObject from 'lodash/isPlainObject';
import {
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '@kbn/maps-ems-plugin/common';
import type { LayerDescriptor } from '../descriptor_types';
import { AUTOSELECT_EMS_LOCALE, LAYER_STYLE_TYPE, LAYER_TYPE, SOURCE_TYPES } from '../constants';

export interface LegacyBasemapLayersOptions {
  readonly idGenerator: () => string;
}

export function normalizeLegacyEmsBasemapId(id: string): string {
  // Legacy tile/region maps stored older raster style ids.
  // Maps uses vector basemap ids (Borealis theme), so map known raster ids.
  if (id === 'road_map_desaturated') return DEFAULT_EMS_ROADMAP_DESATURATED_ID;
  return id;
}

function getSelectedTmsLayerIdFromLegacyParams(legacyParams: unknown): string | undefined {
  if (!isPlainObject(legacyParams)) return undefined;
  const wms = (legacyParams as any).wms;
  if (!isPlainObject(wms)) return undefined;
  const selectedTmsLayer = (wms as any).selectedTmsLayer;
  if (!isPlainObject(selectedTmsLayer)) return undefined;

  const id = (selectedTmsLayer as any).id;
  return typeof id === 'string' ? normalizeLegacyEmsBasemapId(id) : undefined;
}

function getIsDesaturatedFromLegacyParams(legacyParams: unknown): boolean | undefined {
  if (!isPlainObject(legacyParams)) return undefined;
  return typeof (legacyParams as any).isDesaturated === 'boolean'
    ? (legacyParams as any).isDesaturated
    : undefined;
}

export function getLegacyEmsLightModeDefault(legacyParams: unknown): string | undefined {
  const selectedTmsLayerId = getSelectedTmsLayerIdFromLegacyParams(legacyParams);
  if (selectedTmsLayerId) return selectedTmsLayerId;

  const isDesaturated = getIsDesaturatedFromLegacyParams(legacyParams);
  if (isDesaturated === true) return DEFAULT_EMS_ROADMAP_DESATURATED_ID;
  if (isDesaturated === false) return DEFAULT_EMS_ROADMAP_ID;

  return undefined;
}

export function createEmsVectorTileBasemapLayerDescriptor({
  id,
  // When undefined, default to desaturated (current Maps default for light mode).
  lightModeDefault = DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  // Always use auto select so dark mode uses dark basemap.
  isAutoSelect = true,
}: {
  id: string;
  lightModeDefault?: string;
  isAutoSelect?: boolean;
}): LayerDescriptor {
  return {
    id,
    type: LAYER_TYPE.EMS_VECTOR_TILE,
    label: undefined,
    alpha: 1,
    visible: true,
    minZoom: 0,
    maxZoom: 24,
    includeInFitToBounds: true,
    __dataRequests: [],
    locale: AUTOSELECT_EMS_LOCALE,
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_TMS,
      id: undefined,
      isAutoSelect,
      lightModeDefault,
    },
    style: { type: LAYER_STYLE_TYPE.EMS_VECTOR_TILE, color: '' },
  };
}

export function createWmsOverlayLayerDescriptor({
  id,
  serviceUrl,
  layers,
  styles,
}: {
  id: string;
  serviceUrl: string;
  layers: string;
  styles: string;
}): LayerDescriptor {
  return {
    id,
    type: LAYER_TYPE.RASTER_TILE,
    alpha: 1,
    visible: true,
    minZoom: 0,
    maxZoom: 24,
    includeInFitToBounds: true,
    __dataRequests: [],
    sourceDescriptor: {
      type: SOURCE_TYPES.WMS,
      serviceUrl,
      layers,
      styles,
    },
    style: { type: LAYER_STYLE_TYPE.TILE },
  };
}

export function createLegacyCompatibleBasemapLayersFromLegacyParams(
  legacyParams: unknown,
  { idGenerator }: LegacyBasemapLayersOptions
): LayerDescriptor[] {
  const lightModeDefault = getLegacyEmsLightModeDefault(legacyParams);
  const basemap = createEmsVectorTileBasemapLayerDescriptor({
    id: idGenerator(),
    lightModeDefault: lightModeDefault ?? undefined,
  });

  if (!isPlainObject(legacyParams)) return [basemap];
  const wms = (legacyParams as any).wms;
  if (
    !isPlainObject(wms) ||
    (wms as any).enabled !== true ||
    typeof (wms as any).url !== 'string'
  ) {
    return [basemap];
  }

  const options = (wms as any).options;
  const layers =
    isPlainObject(options) && typeof (options as any).layers === 'string'
      ? (options as any).layers
      : '';
  const styles =
    isPlainObject(options) && typeof (options as any).styles === 'string'
      ? (options as any).styles
      : '';

  return [
    basemap,
    createWmsOverlayLayerDescriptor({
      id: idGenerator(),
      serviceUrl: (wms as any).url,
      layers,
      styles,
    }),
  ];
}
