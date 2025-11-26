/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGeoPointSuggestion } from './utils';
import type { SchemaEditorField } from './types';

describe('getGeoPointSuggestion', () => {
  const mockFields = [
    { name: 'geo.lat', status: 'unmapped' },
    { name: 'geo.lon', status: 'unmapped' },
    { name: 'other', status: 'mapped', type: 'keyword' },
  ] as SchemaEditorField[];

  it('should return null for non-classic streams', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields: mockFields, streamType: 'wired' })
    ).toBeNull();
  });

  it('should return null if fields are undefined', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields: undefined, streamType: 'classic' })
    ).toBeNull();
  });

  it('should return null if field name does not end in .lat or .lon', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.other', fields: mockFields, streamType: 'classic' })
    ).toBeNull();
  });

  it('should return suggestion if sibling exists and base field is not mapped as geo_point', () => {
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields: mockFields, streamType: 'classic' })
    ).toEqual({ base: 'geo' });
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lon', fields: mockFields, streamType: 'classic' })
    ).toEqual({ base: 'geo' });
  });

  it('should return null if sibling does not exist', () => {
    const fields = [{ name: 'geo.lat', status: 'unmapped' }] as SchemaEditorField[];
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields, streamType: 'classic' })
    ).toBeNull();
  });

  it('should return null if base field is already mapped as geo_point', () => {
    const fields = [
      { name: 'geo.lat', status: 'unmapped' },
      { name: 'geo.lon', status: 'unmapped' },
      { name: 'geo', status: 'mapped', type: 'geo_point' },
    ] as SchemaEditorField[];
    expect(
      getGeoPointSuggestion({ fieldName: 'geo.lat', fields, streamType: 'classic' })
    ).toBeNull();
  });
});
