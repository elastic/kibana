/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { IndexPatternMapping } from './types';

// Update source/destination field mappings to modify what fields will be returned to map tooltip
const sourceFieldMappings: Record<string, string> = {
  'host.name': 'Host',
  'source.ip': 'Source IP',
  'source.domain': 'Source Domain',
  'source.geo.country_iso_code': 'Location',
  'source.as.organization.name': 'ASN',
};
const destinationFieldMappings: Record<string, string> = {
  'host.name': 'Host',
  'destination.ip': 'Destination IP',
  'destination.domain': 'Destination Domain',
  'destination.geo.country_iso_code': 'Location',
  'destination.as.organization.name': 'ASN',
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
      applyGlobalQuery: true,
      style: { type: 'TILE', properties: {} },
      type: 'TILE',
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
      fillColor: { type: 'STATIC', options: { color: '#3185FC' } },
      lineColor: { type: 'STATIC', options: { color: '#FFFFFF' } },
      lineWidth: { type: 'STATIC', options: { size: 1 } },
      iconSize: { type: 'STATIC', options: { size: 6 } },
      iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
      symbol: { options: { symbolizeAs: 'circle', symbolId: 'arrow-es' } },
    },
  },
  id: uuid.v4(),
  label: `${indexPatternTitle} | Source Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.75,
  visible: true,
  applyGlobalQuery: true,
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
      fillColor: { type: 'STATIC', options: { color: '#DB1374' } },
      lineColor: { type: 'STATIC', options: { color: '#FFFFFF' } },
      lineWidth: { type: 'STATIC', options: { size: 1 } },
      iconSize: { type: 'STATIC', options: { size: 6 } },
      iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
      symbol: { options: { symbolizeAs: 'circle', symbolId: 'airfield' } },
    },
  },
  id: uuid.v4(),
  label: `${indexPatternTitle} | Destination Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.75,
  visible: true,
  applyGlobalQuery: true,
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
      fillColor: { type: 'STATIC', options: { color: '#e6194b' } },
      lineColor: {
        type: 'DYNAMIC',
        options: {
          color: 'Green to Red',
          field: { label: 'count', name: 'doc_count', origin: 'source' },
          useCustomColorRamp: false,
        },
      },
      lineWidth: {
        type: 'DYNAMIC',
        options: {
          minSize: 1,
          maxSize: 4,
          field: { label: 'count', name: 'doc_count', origin: 'source' },
        },
      },
      iconSize: { type: 'STATIC', options: { size: 10 } },
      iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
      symbol: { options: { symbolizeAs: 'circle', symbolId: 'airfield' } },
    },
  },
  id: uuid.v4(),
  label: `${indexPatternTitle} | Line`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  applyGlobalQuery: true,
  type: 'VECTOR',
  query: { query: '', language: 'kuery' },
});
