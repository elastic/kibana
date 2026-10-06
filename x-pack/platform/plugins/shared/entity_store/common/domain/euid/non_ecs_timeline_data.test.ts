/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import type { NonEcsTimelineDataRow } from './non_ecs_timeline_data';
import {
  getEuidFromTimelineNonEcsData,
  getEuidFromTimelineNonEcsDataFromDefinition,
  getEntityIdentifiersFromTimelineNonEcsData,
  getEntityIdentifiersFromTimelineNonEcsDataFromDefinition,
  nonEcsTimelineDataToDocument,
} from './non_ecs_timeline_data';

describe('nonEcsTimelineDataToDocument', () => {
  it('returns empty object for default, empty, or rows with no usable values', () => {
    expect(nonEcsTimelineDataToDocument()).toEqual({});
    expect(nonEcsTimelineDataToDocument([])).toEqual({});
    expect(nonEcsTimelineDataToDocument([{ field: 'host.name' }])).toEqual({});
    expect(nonEcsTimelineDataToDocument([{ field: 'host.name', value: undefined }])).toEqual({});
  });

  it('maps dotted ECS fields to flat keys', () => {
    expect(
      nonEcsTimelineDataToDocument([
        { field: 'host.name', value: ['server1'] },
        { field: 'host.id', value: ['hid-1'] },
      ])
    ).toEqual({
      'host.name': 'server1',
      'host.id': 'hid-1',
    });
  });

  it('keeps first non-empty value when the same field appears twice', () => {
    expect(
      nonEcsTimelineDataToDocument([
        { field: 'host.name', value: ['from-data'] },
        { field: 'host.name', value: ['from-ecs'] },
      ])
    ).toEqual({ 'host.name': 'from-data' });
  });

  it('skips null, empty, and missing values', () => {
    expect(
      nonEcsTimelineDataToDocument([
        { field: 'host.name', value: null },
        { field: 'host.name', value: [''] },
        { field: 'host.id', value: ['x'] },
      ])
    ).toEqual({ 'host.id': 'x' });
  });

  it('uses first non-empty element in a value array', () => {
    expect(nonEcsTimelineDataToDocument([{ field: 'host.name', value: ['', 'n1'] }])).toEqual({
      'host.name': 'n1',
    });
  });
});

describe('getEuidFromTimelineNonEcsData', () => {
  it('returns undefined when no identity fields are present', () => {
    expect(getEuidFromTimelineNonEcsData('host', [{ field: 'host.domain', value: ['d'] }])).toBe(
      undefined
    );
  });

  it('derives host euid from dotted host.id row', () => {
    expect(getEuidFromTimelineNonEcsData('host', [{ field: 'host.id', value: ['h-1'] }])).toBe(
      'host:h-1'
    );
  });

  it('returns undefined for empty rows', () => {
    expect(getEuidFromTimelineNonEcsData('host', undefined)).toBeUndefined();
    expect(getEuidFromTimelineNonEcsData('host', [])).toBeUndefined();
  });
});

describe('getEntityIdentifiersFromTimelineNonEcsData', () => {
  it('returns identifier map from timeline rows', () => {
    expect(
      getEntityIdentifiersFromTimelineNonEcsData('host', [{ field: 'host.id', value: ['h-1'] }])
    ).toEqual({ 'host.id': 'h-1' });
  });
});

describe('FromDefinition variants', () => {
  const rowsByType: Array<[EntityType, NonEcsTimelineDataRow[]]> = [
    [
      'user',
      [
        { field: 'user.email', value: ['alice@example.com'] },
        { field: 'event.kind', value: ['asset'] },
        { field: 'event.module', value: ['okta'] },
      ],
    ],
    ['host', [{ field: 'host.id', value: ['h-1'] }]],
    ['service', [{ field: 'service.name', value: ['api-gateway'] }]],
    ['generic', [{ field: 'entity.id', value: ['e-123'] }]],
  ];

  it.each(rowsByType)('match the type-name functions for %s', (type, rows) => {
    const definition = getEntityDefinitionWithoutId(type);

    expect(getEuidFromTimelineNonEcsDataFromDefinition(definition, rows)).toEqual(
      getEuidFromTimelineNonEcsData(type, rows)
    );
    expect(getEntityIdentifiersFromTimelineNonEcsDataFromDefinition(definition, rows)).toEqual(
      getEntityIdentifiersFromTimelineNonEcsData(type, rows)
    );
  });
});
