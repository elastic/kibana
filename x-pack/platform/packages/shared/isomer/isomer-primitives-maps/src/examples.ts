/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapNode } from './types';

export const mapCanonicalExample: MapNode = {
  type: 'map',
  label: 'Failed logins by city',
  view: 'fit',
  markers: [
    { id: 'nyc', lat: 40.71, lon: -74.01, label: 'New York', value: 42, tone: 'danger' },
    { id: 'lon', lat: 51.51, lon: -0.13, label: 'London', value: 18, tone: 'warning' },
    { id: 'tyo', lat: 35.68, lon: 139.69, label: 'Tokyo', value: 9, tone: 'neutral' },
  ],
  legend: { unit: 'events' },
};

export const mapGridExample: MapNode = {
  type: 'map',
  label: 'Ingest volume',
  view: 'fit',
  cellShape: 'grid',
  cells: [
    { key: '4/4/6', value: 1200 },
    { key: '4/5/6', value: 340 },
    { key: '4/4/7', value: 80 },
  ],
  legend: { unit: 'docs' },
};

export const mapRegionExample: MapNode = {
  type: 'map',
  label: 'Alerts by country',
  view: 'fit',
  regionSet: 'world_countries',
  regions: [
    { code: 'US', label: 'United States', value: 412, tone: 'danger' },
    { code: 'DE', label: 'Germany', value: 88, tone: 'warning' },
    { code: 'JP', label: 'Japan', value: 21, tone: 'neutral' },
  ],
};

export const mapExamples: MapNode[] = [mapCanonicalExample, mapGridExample, mapRegionExample];
