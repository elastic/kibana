/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternMapping } from '../types';

export const mockIndexPatternIds: IndexPatternMapping[] = [
  { title: 'filebeat-*', id: '8c7323ac-97ad-4b53-ac0a-40f8f691a918' },
];

export const mockSourceLayer = {
  sourceDescriptor: {
    id: 'uuid.v4()',
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
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
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
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
  id: 'uuid.v4()',
  label: `filebeat-* | Source Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: 'VECTOR',
  query: { query: '', language: 'kuery' },
  joins: [],
};

export const mockDestinationLayer = {
  sourceDescriptor: {
    id: 'uuid.v4()',
    type: 'ES_SEARCH',
    applyGlobalQuery: true,
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
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
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
  id: 'uuid.v4()',
  label: `filebeat-* | Destination Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  type: 'VECTOR',
  query: { query: '', language: 'kuery' },
};

export const mockLineLayer = {
  sourceDescriptor: {
    type: 'ES_PEW_PEW',
    applyGlobalQuery: true,
    id: 'uuid.v4()',
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
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
  id: 'uuid.v4()',
  label: `filebeat-* | Line`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.5,
  visible: true,
  type: 'VECTOR',
  query: { query: '', language: 'kuery' },
};

export const mockLayerList = [
  {
    sourceDescriptor: { type: 'EMS_TMS', isAutoSelect: true },
    id: 'uuid.v4()',
    label: null,
    minZoom: 0,
    maxZoom: 24,
    alpha: 1,
    visible: true,
    style: null,
    type: 'VECTOR_TILE',
  },
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
];

export const mockLayerListDouble = [
  {
    sourceDescriptor: { type: 'EMS_TMS', isAutoSelect: true },
    id: 'uuid.v4()',
    label: null,
    minZoom: 0,
    maxZoom: 24,
    alpha: 1,
    visible: true,
    style: null,
    type: 'VECTOR_TILE',
  },
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
];
