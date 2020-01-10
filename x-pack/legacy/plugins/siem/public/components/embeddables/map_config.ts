/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { IndexPatternMapping } from './types';
import * as i18n from './translations';

// Update source/destination field mappings to modify what fields will be returned to map tooltip
const sourceFieldMappings: Record<string, string> = {
  'host.name': i18n.HOST,
  'source.ip': i18n.SOURCE_IP,
  'source.domain': i18n.SOURCE_DOMAIN,
  'source.geo.country_iso_code': i18n.LOCATION,
  'source.as.organization.name': i18n.ASN,
};
const destinationFieldMappings: Record<string, string> = {
  'host.name': i18n.HOST,
  'destination.ip': i18n.DESTINATION_IP,
  'destination.domain': i18n.DESTINATION_DOMAIN,
  'destination.geo.country_iso_code': i18n.LOCATION,
  'destination.as.organization.name': i18n.ASN,
};

// Mapping of field -> display name for use within map tooltip
export const sourceDestinationFieldMappings: Record<string, string> = {
  ...sourceFieldMappings,
  ...destinationFieldMappings,
};

// Field names of LineLayer props returned from Maps API
export const SUM_OF_SOURCE_BYTES = 'sum_of_source.bytes';
export const SUM_OF_DESTINATION_BYTES = 'sum_of_destination.bytes';

/**
 * Returns `Source/Destination Point-to-point` Map LayerList configuration, with a source,
 * destination, and line layer for each of the provided indexPatterns
 *
 * @param indexPatternIds array of indexPatterns' title and id
 */
export const getLayerList = (indexPatternIds: IndexPatternMapping[]) => {
  return [
    {
      sourceDescriptor: { type: 'EMS_TMS', isAutoSelect: true },
      id: uuid.v4(),
      label: null,
      minZoom: 0,
      maxZoom: 24,
      alpha: 1,
      visible: true,
      style: null,
      type: 'VECTOR_TILE',
    },
    ...indexPatternIds.reduce((acc: object[], { title, id }) => {
      return [
        ...acc,
        getLineLayer(title, id),
        getDestinationLayer(title, id),
        getSourceLayer(title, id),
      ];
    }, []),
  ];
};

/**
 * Returns Document Data Source layer configuration ('source.geo.location') for the given
 * indexPattern title/id
 *
 * @param indexPatternTitle used as layer name in LayerToC UI: "${indexPatternTitle} | Source point"
 * @param indexPatternId used as layer's indexPattern to query for data
 */
export const getSourceLayer = (indexPatternTitle: string, indexPatternId: string) => ({
  sourceDescriptor: {
    id: uuid.v4(),
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
    geoField: 'source.geo.location',
    filterByMapBounds: false,
    tooltipProperties: Object.keys(sourceFieldMappings),
    useTopHits: false,
    topHitsTimeField: '@timestamp',
    topHitsSize: 1,
    indexPatternId,
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: '#3185FC' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: '#FFFFFF' },
      },
      lineWidth: { type: 'STATIC', options: { size: 2 } },
      iconSize: { type: 'STATIC', options: { size: 8 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbol: {
        options: { symbolizeAs: 'icon', symbolId: 'home' },
      },
    },
  },
  id: uuid.v4(),
  label: `${indexPatternTitle} | ${i18n.SOURCE_LAYER}`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: 'VECTOR',
  query: { query: '', language: 'kuery' },
  joins: [],
});

/**
 * Returns Document Data Source layer configuration ('destination.geo.location') for the given
 * indexPattern title/id
 *
 * @param indexPatternTitle used as layer name in LayerToC UI: "${indexPatternTitle} | Destination point"
 * @param indexPatternId used as layer's indexPattern to query for data
 */
export const getDestinationLayer = (indexPatternTitle: string, indexPatternId: string) => ({
  sourceDescriptor: {
    id: uuid.v4(),
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
    geoField: 'destination.geo.location',
    filterByMapBounds: true,
    tooltipProperties: Object.keys(destinationFieldMappings),
    useTopHits: false,
    topHitsTimeField: '@timestamp',
    topHitsSize: 1,
    indexPatternId,
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: '#DB1374' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: '#FFFFFF' },
      },
      lineWidth: { type: 'STATIC', options: { size: 2 } },
      iconSize: { type: 'STATIC', options: { size: 8 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbol: {
        options: { symbolizeAs: 'icon', symbolId: 'marker' },
      },
    },
  },
  id: uuid.v4(),
  label: `${indexPatternTitle} | ${i18n.DESTINATION_LAYER}`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: 'VECTOR',
  query: { query: '', language: 'kuery' },
});

/**
 * Returns Point-to-point Data Source layer configuration ('source.geo.location' &
 * 'source.geo.location') for the given indexPattern title/id
 *
 * @param indexPatternTitle used as layer name in LayerToC UI: "${indexPatternTitle} | Line"
 * @param indexPatternId used as layer's indexPattern to query for data
 */
export const getLineLayer = (indexPatternTitle: string, indexPatternId: string) => ({
  sourceDescriptor: {
    type: 'ES_PEW_PEW',
    applyGlobalQuery: true,
    id: uuid.v4(),
    indexPatternId,
    sourceGeoField: 'source.geo.location',
    destGeoField: 'destination.geo.location',
    metrics: [
      { type: 'sum', field: 'source.bytes', label: 'source.bytes' },
      { type: 'sum', field: 'destination.bytes', label: 'destination.bytes' },
    ],
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: {
        type: 'STATIC',
        options: { color: '#1EA593' },
      },
      lineColor: {
        type: 'STATIC',
        options: { color: '#3185FC' },
      },
      lineWidth: {
        type: 'DYNAMIC',
        options: {
          field: {
            label: 'count',
            name: 'doc_count',
            origin: 'source',
          },
          minSize: 1,
          maxSize: 8,
          fieldMetaOptions: {
            isEnabled: true,
            sigma: 3,
          },
        },
      },
      iconSize: { type: 'STATIC', options: { size: 10 } },
      iconOrientation: {
        type: 'STATIC',
        options: { orientation: 0 },
      },
      symbol: {
        options: { symbolizeAs: 'circle', symbolId: 'airfield' },
      },
    },
  },
  id: uuid.v4(),
  label: `${indexPatternTitle} | ${i18n.LINE_LAYER}`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.5,
  visible: true,
  type: 'VECTOR',
  query: { query: '', language: 'kuery' },
});
