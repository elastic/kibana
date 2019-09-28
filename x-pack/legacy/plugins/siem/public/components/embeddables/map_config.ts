/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { IndexPatternMapping } from './types';

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
    tooltipProperties: [
      'host.name',
      'source.ip',
      'source.domain',
      'source.geo.country_iso_code',
      'source.as.organization.name',
    ],
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
    tooltipProperties: [
      'host.name',
      'destination.ip',
      'destination.domain',
      'destination.geo.country_iso_code',
      'destination.as.organization.name',
    ],
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
      { type: 'sum', field: 'source.bytes', label: 'Total Src Bytes' },
      { type: 'sum', field: 'destination.bytes', label: 'Total Dest Bytes' },
      { type: 'count', label: 'Total Documents' },
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
