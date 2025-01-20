/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRuleType,
  injectEntityAndBoundaryIds,
  extractEntityAndBoundaryReferences,
} from './rule_type';
import type { GeoContainmentRuleParams } from './types';

describe('ruleType', () => {
  const ruleType = getRuleType();

  it('alert type creation structure is the expected value', async () => {
    expect(ruleType.id).toBe('.geo-containment');
    expect(ruleType.name).toBe('Tracking containment');
    expect(ruleType.actionGroups).toEqual([
      { id: 'Tracked entity contained', name: 'Tracking containment met' },
    ]);
    expect(ruleType.recoveryActionGroup).toEqual({
      id: 'notGeoContained',
      name: 'No longer contained',
    });

    expect(ruleType.actionVariables).toMatchSnapshot();
  });

  it('validator succeeds with valid params', async () => {
    const params: GeoContainmentRuleParams = {
      index: 'testIndex',
      indexId: 'testIndexId',
      geoField: 'testField',
      entity: 'testField',
      dateField: 'testField',
      boundaryType: 'testType',
      boundaryIndexTitle: 'testIndex',
      boundaryIndexId: 'testIndex',
      boundaryGeoField: 'testField',
      boundaryNameField: 'testField',
    };

    expect(ruleType.validate?.params?.validate(params)).toBeTruthy();
  });

  test('injectEntityAndBoundaryIds', () => {
    expect(
      injectEntityAndBoundaryIds(
        {
          boundaryGeoField: 'geometry',
          boundaryIndexRefName: 'boundary_index_boundaryid',
          boundaryIndexTitle: 'boundary*',
          boundaryType: 'entireIndex',
          dateField: '@timestamp',
          entity: 'vehicle_id',
          geoField: 'geometry',
          index: 'foo*',
          indexRefName: 'tracked_index_foobar',
        },
        [
          {
            id: 'foreign',
            name: 'foobar',
            type: 'foreign',
          },
          {
            id: 'foobar',
            name: 'tracked_index_foobar',
            type: 'index-pattern',
          },
          {
            id: 'foreignToo',
            name: 'boundary_index_shouldbeignored',
            type: 'index-pattern',
          },
          {
            id: 'boundaryid',
            name: 'boundary_index_boundaryid',
            type: 'index-pattern',
          },
        ]
      )
    ).toEqual({
      index: 'foo*',
      indexId: 'foobar',
      geoField: 'geometry',
      entity: 'vehicle_id',
      dateField: '@timestamp',
      boundaryType: 'entireIndex',
      boundaryIndexTitle: 'boundary*',
      boundaryIndexId: 'boundaryid',
      boundaryGeoField: 'geometry',
    });
  });

  test('extractEntityAndBoundaryReferences', () => {
    expect(
      extractEntityAndBoundaryReferences({
        index: 'foo*',
        indexId: 'foobar',
        geoField: 'geometry',
        entity: 'vehicle_id',
        dateField: '@timestamp',
        boundaryType: 'entireIndex',
        boundaryIndexTitle: 'boundary*',
        boundaryIndexId: 'boundaryid',
        boundaryGeoField: 'geometry',
      })
    ).toEqual({
      params: {
        boundaryGeoField: 'geometry',
        boundaryIndexRefName: 'boundary_index_boundaryid',
        boundaryIndexTitle: 'boundary*',
        boundaryType: 'entireIndex',
        dateField: '@timestamp',
        entity: 'vehicle_id',
        geoField: 'geometry',
        index: 'foo*',
        indexRefName: 'tracked_index_foobar',
      },
      references: [
        {
          id: 'foobar',
          name: 'tracked_index_foobar',
          type: 'index-pattern',
        },
        {
          id: 'boundaryid',
          name: 'boundary_index_boundaryid',
          type: 'index-pattern',
        },
      ],
    });
  });
});
