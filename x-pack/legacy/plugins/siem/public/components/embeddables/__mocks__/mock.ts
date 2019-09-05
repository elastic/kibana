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
    geoField: 'source.geo.location',
    filterByMapBounds: false,
    tooltipProperties: ['host.name', 'source.ip', 'source.domain', 'source.as.organization.name'],
    useTopHits: false,
    topHitsTimeField: '@timestamp',
    topHitsSize: 1,
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
  },
  style: {
    type: 'VECTOR',
    properties: {
      fillColor: { type: 'STATIC', options: { color: '#3cb44b' } },
      lineColor: { type: 'STATIC', options: { color: '#FFFFFF' } },
      lineWidth: { type: 'STATIC', options: { size: 1 } },
      iconSize: { type: 'STATIC', options: { size: 6 } },
      iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
      symbol: { options: { symbolizeAs: 'circle', symbolId: 'arrow-es' } },
    },
  },
  id: 'uuid.v4()',
  label: `filebeat-* | Source Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.75,
  visible: true,
  applyGlobalQuery: true,
  type: 'VECTOR',
  query: { query: 'source.geo.location:* and destination.geo.location:*', language: 'kuery' },
  joins: [],
};

export const mockDestinationLayer = {
  sourceDescriptor: {
    id: 'uuid.v4()',
    type: 'ES_SEARCH',
    geoField: 'destination.geo.location',
    filterByMapBounds: true,
    tooltipProperties: [
      'host.name',
      'destination.ip',
      'destination.domain',
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
      fillColor: { type: 'STATIC', options: { color: '#e6194b' } },
      lineColor: { type: 'STATIC', options: { color: '#FFFFFF' } },
      lineWidth: { type: 'STATIC', options: { size: 1 } },
      iconSize: { type: 'STATIC', options: { size: 6 } },
      iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
      symbol: { options: { symbolizeAs: 'circle', symbolId: 'airfield' } },
    },
  },
  id: 'uuid.v4()',
  label: `filebeat-* | Destination Point`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 0.75,
  visible: true,
  applyGlobalQuery: true,
  type: 'VECTOR',
  query: { query: 'source.geo.location:* and destination.geo.location:*', language: 'kuery' },
};

export const mockLineLayer = {
  sourceDescriptor: {
    type: 'ES_PEW_PEW',
    id: 'uuid.v4()',
    indexPatternId: '8c7323ac-97ad-4b53-ac0a-40f8f691a918',
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
  id: 'uuid.v4()',
  label: `filebeat-* | Line`,
  minZoom: 0,
  maxZoom: 24,
  alpha: 1,
  visible: true,
  applyGlobalQuery: true,
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
    applyGlobalQuery: true,
    style: { type: 'TILE', properties: {} },
    type: 'TILE',
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
    applyGlobalQuery: true,
    style: { type: 'TILE', properties: {} },
    type: 'TILE',
  },
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
  mockLineLayer,
  mockDestinationLayer,
  mockSourceLayer,
];
