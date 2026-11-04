/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMSClient, type FileLayer } from '@elastic/ems-client';
import type { Feature } from 'geojson';
import type { PreviewEmsSettings } from './types';

// The `map.*` defaults of the `mapsEms` plugin (`@kbn/maps-ems-plugin/common`), for when the plugin
// is not available. The client uses EMS's versioned REST API, as serverless Kibana does.
const DEFAULT_EMS_SETTINGS: PreviewEmsSettings = {
  isEnabled: true,
  fileApiUrl: 'https://vector.maps.elastic.co',
  tileApiUrl: 'https://tiles.maps.elastic.co',
  landingPageUrl: 'https://maps.elastic.co',
};
const EMS_REST_VERSION = '2023-10-31';
const EMS_TIMEOUT_MS = 15000;
const EMS_CACHE_SIZE = 10;

/** The EMS boundaries Lens joins to when the config names none: `emsWorldLayerId` by `iso2`. */
export const EMS_WORLD_LAYER_ID = 'world_countries';
export const EMS_WORLD_JOIN_FIELD = 'iso2';

// The layer catalog of each EMS file API URL.
const fileLayersPromises = new Map<string, Promise<FileLayer[]>>();
// Downloads in flight, by layer id; the client keeps the last `EMS_CACHE_SIZE` layers it parsed.
const featuresPromises = new Map<string, Promise<Feature[]>>();

const createEmsClient = ({
  fileApiUrl,
  tileApiUrl,
  landingPageUrl,
}: PreviewEmsSettings): EMSClient =>
  new EMSClient({
    appName: 'kibana',
    appVersion: EMS_REST_VERSION,
    emsVersion: EMS_REST_VERSION,
    language: 'en',
    tileApiUrl,
    fileApiUrl,
    landingPageUrl,
    fetchFunction: (url) =>
      fetch(url, {
        headers: { 'elastic-api-version': EMS_REST_VERSION },
        signal: AbortSignal.timeout(EMS_TIMEOUT_MS),
      }),
    proxyPath: '',
    cacheSize: EMS_CACHE_SIZE,
  });

/**
 * The boundary layers of the Elastic Maps Service that Kibana's `map.*` settings point to. The
 * catalog is cached in memory; a failed request is not, so the next preview tries again.
 */
export const getEmsFileLayers = (
  settings: PreviewEmsSettings = DEFAULT_EMS_SETTINGS
): Promise<FileLayer[]> => {
  if (!settings.isEnabled) {
    return Promise.reject(
      new Error('Elastic Maps Service is turned off (map.includeElasticMapsService)')
    );
  }
  let promise = fileLayersPromises.get(settings.fileApiUrl);
  if (!promise) {
    promise = createEmsClient(settings)
      .getFileLayers()
      .catch((error: Error) => {
        fileLayersPromises.delete(settings.fileApiUrl);
        throw new Error(`Elastic Maps Service is not reachable: ${error.message}`);
      });
    fileLayersPromises.set(settings.fileApiUrl, promise);
  }
  return promise;
};

/** The features of one EMS boundary layer; recently used layers are cached in memory. */
export const getEmsFeatures = (fileLayer: FileLayer): Promise<Feature[]> => {
  const id = fileLayer.getId();
  const cacheKey = `${fileLayer.getDefaultFormatUrl()} ${id}`;
  let promise = featuresPromises.get(cacheKey);
  if (!promise) {
    promise = fileLayer.getGeoJson().then(
      (featureCollection) => {
        if (!featureCollection) {
          throw new Error(`Elastic Maps Service returned no boundaries for "${id}"`);
        }
        return featureCollection.features;
      },
      (error: Error) => {
        throw new Error(`Cannot download "${id}" from Elastic Maps Service: ${error.message}`);
      }
    );
    promise.then(
      () => featuresPromises.delete(cacheKey),
      () => featuresPromises.delete(cacheKey)
    );
    featuresPromises.set(cacheKey, promise);
  }
  return promise;
};

/**
 * Picks the EMS layer and field whose known ids contain every sample value, like Lens does for
 * region maps without an explicit join (`emsAutoSuggest` in the maps plugin).
 */
export const suggestEmsJoin = (
  fileLayers: readonly FileLayer[],
  sampleValues: readonly string[]
): { layerId: string; field: string } | undefined => {
  if (!sampleValues.length) {
    return undefined;
  }
  for (const fileLayer of fileLayers) {
    for (const { id, values } of fileLayer.getFields()) {
      if (values?.length && sampleValues.every((value) => values.includes(value))) {
        return { layerId: fileLayer.getId(), field: id };
      }
    }
  }
  return undefined;
};
