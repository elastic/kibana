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
import type { EMSVectorTileLayerDescriptor, RasterLayerDescriptor } from '../descriptor_types';
import { AUTOSELECT_EMS_LOCALE, LAYER_STYLE_TYPE, LAYER_TYPE, SOURCE_TYPES } from '../constants';

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
}): EMSVectorTileLayerDescriptor {
  return {
    id,
    type: LAYER_TYPE.EMS_VECTOR_TILE,
    alpha: 1,
    visible: true,
    minZoom: 0,
    maxZoom: 24,
    includeInFitToBounds: true,
    __dataRequests: [],
    locale: AUTOSELECT_EMS_LOCALE,
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_TMS,
      isAutoSelect,
      lightModeDefault,
    },
    style: { type: LAYER_STYLE_TYPE.EMS_VECTOR_TILE, color: '' },
  };
}

function createWmsOverlayLayerDescriptor({
  id,
  serviceUrl,
  layers,
  styles,
}: {
  id: string;
  serviceUrl: string;
  layers: string;
  styles: string;
}): RasterLayerDescriptor {
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
  };
}

export function createLegacyCompatibleBasemapLayersFromLegacyParams(
  legacyParams: unknown,
  idGenerator: () => string
): Array<EMSVectorTileLayerDescriptor | RasterLayerDescriptor> {
  let lightModeDefault: string | undefined;
  if (isPlainObject(legacyParams)) {
    const legacy = legacyParams as Record<string, unknown>;
    const wms = legacy.wms;
    if (isPlainObject(wms)) {
      const wmsRecord = wms as Record<string, unknown>;
      const selectedTmsLayer = wmsRecord.selectedTmsLayer;
      if (isPlainObject(selectedTmsLayer)) {
        const rawId = (selectedTmsLayer as Record<string, unknown>).id;
        if (typeof rawId === 'string') {
          // Legacy tile/region maps stored older raster style ids.
          lightModeDefault =
            rawId === 'road_map_desaturated' ? DEFAULT_EMS_ROADMAP_DESATURATED_ID : rawId;
        }
      }
    }

    if (!lightModeDefault && typeof legacy.isDesaturated === 'boolean') {
      lightModeDefault = legacy.isDesaturated
        ? DEFAULT_EMS_ROADMAP_DESATURATED_ID
        : DEFAULT_EMS_ROADMAP_ID;
    }
  }

  const basemap = createEmsVectorTileBasemapLayerDescriptor({
    id: idGenerator(),
    lightModeDefault: lightModeDefault ?? undefined,
  });

  if (!isPlainObject(legacyParams)) return [basemap];
  const legacy = legacyParams as Record<string, unknown>;
  const wms = legacy.wms;
  if (
    !isPlainObject(wms) ||
    (wms as Record<string, unknown>).enabled !== true ||
    typeof (wms as Record<string, unknown>).url !== 'string'
  ) {
    return [basemap];
  }

  const wmsRecord = wms as Record<string, unknown>;
  const options = wmsRecord.options;
  const layers =
    isPlainObject(options) && typeof (options as Record<string, unknown>).layers === 'string'
      ? ((options as Record<string, unknown>).layers as string)
      : '';
  const styles =
    isPlainObject(options) && typeof (options as Record<string, unknown>).styles === 'string'
      ? ((options as Record<string, unknown>).styles as string)
      : '';

  return [
    basemap,
    createWmsOverlayLayerDescriptor({
      id: idGenerator(),
      serviceUrl: wmsRecord.url as string,
      layers,
      styles,
    }),
  ];
}
