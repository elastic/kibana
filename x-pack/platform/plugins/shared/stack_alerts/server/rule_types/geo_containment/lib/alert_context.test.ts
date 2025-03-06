/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContainedAlertContext, getRecoveredAlertContext } from './alert_context';
import { OTHER_CATEGORY } from '../constants';

test('getContainedAlertContext', () => {
  expect(
    getContainedAlertContext({
      entityName: 'entity1',
      containment: {
        location: [0, 0],
        locationWkt: 'POINT (100 0)',
        shapeLocationId: 'boundary1Id',
        dateInShape: '2022-06-21T16:56:11.923Z',
        docId: 'docId',
      },
      shapesIdsNamesMap: { boundary1Id: 'boundary1Name' },
      windowEnd: new Date('2022-06-21T17:00:00.000Z'),
    })
  ).toEqual({
    containingBoundaryId: 'boundary1Id',
    containingBoundaryName: 'boundary1Name',
    detectionDateTime: '2022-06-21T17:00:00.000Z',
    entityDateTime: '2022-06-21T16:56:11.923Z',
    entityDocumentId: 'docId',
    entityId: 'entity1',
    entityLocation: 'POINT (100 0)',
  });
});

test('getContainedAlertContext for backwards compatible number[] location format', () => {
  expect(
    getContainedAlertContext({
      entityName: 'entity1',
      containment: {
        location: [100, 0],
        shapeLocationId: 'boundary1Id',
        dateInShape: '2022-06-21T16:56:11.923Z',
        docId: 'docId',
      },
      shapesIdsNamesMap: { boundary1Id: 'boundary1Name' },
      windowEnd: new Date('2022-06-21T17:00:00.000Z'),
    })
  ).toEqual({
    containingBoundaryId: 'boundary1Id',
    containingBoundaryName: 'boundary1Name',
    detectionDateTime: '2022-06-21T17:00:00.000Z',
    entityDateTime: '2022-06-21T16:56:11.923Z',
    entityDocumentId: 'docId',
    entityId: 'entity1',
    entityLocation: 'POINT (100 0)',
  });
});

describe('getRecoveredAlertContext', () => {
  test('should set context from contained entity location when entity is contained by another boundary', () => {
    const activeEntities = new Map();
    activeEntities.set('entity1', [
      {
        location: [0, 0],
        locationWkt: 'POINT (100 0)',
        shapeLocationId: 'boundary1Id',
        dateInShape: '2022-06-21T16:56:11.923Z',
        docId: 'docId',
      },
    ]);
    expect(
      getRecoveredAlertContext({
        alertId: 'entity1-boundary1Name',
        activeEntities,
        inactiveEntities: new Map(),
        windowEnd: new Date('2022-06-21T17:00:00.000Z'),
      })
    ).toEqual({
      detectionDateTime: '2022-06-21T17:00:00.000Z',
      entityDateTime: '2022-06-21T16:56:11.923Z',
      entityDocumentId: 'docId',
      entityId: 'entity1',
      entityLocation: 'POINT (100 0)',
    });
  });

  test('should set context from uncontained entity location when entity is not contained by another boundary', () => {
    const inactiveEntities = new Map();
    inactiveEntities.set('entity1', [
      {
        location: [0, 0],
        locationWkt: 'POINT (100 0)',
        shapeLocationId: OTHER_CATEGORY,
        dateInShape: '2022-06-21T16:56:11.923Z',
        docId: 'docId',
      },
    ]);
    expect(
      getRecoveredAlertContext({
        alertId: 'entity1-boundary1Name',
        activeEntities: new Map(),
        inactiveEntities,
        windowEnd: new Date('2022-06-21T17:00:00.000Z'),
      })
    ).toEqual({
      detectionDateTime: '2022-06-21T17:00:00.000Z',
      entityDateTime: '2022-06-21T16:56:11.923Z',
      entityDocumentId: 'docId',
      entityId: 'entity1',
      entityLocation: 'POINT (100 0)',
    });
  });
});
