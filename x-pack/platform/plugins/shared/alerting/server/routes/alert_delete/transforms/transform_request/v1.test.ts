/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertDeleteCategoryIds } from '../../../../../common/constants/alert_delete';
import { transformRequestToAlertDeletePreview, transformRequestToAlertDeleteSchedule } from './v1';

describe('transformRequestToAlertDeletePreview', () => {
  it('should transform the request to the expected format', () => {
    const request = {
      active_alert_delete_threshold: 5,
      inactive_alert_delete_threshold: 10,
      category_ids: [alertDeleteCategoryIds.MANAGEMENT, alertDeleteCategoryIds.SECURITY_SOLUTION],
    };

    const expected = {
      isActiveAlertDeleteEnabled: true,
      isInactiveAlertDeleteEnabled: true,
      activeAlertDeleteThreshold: 5,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management', 'securitySolution'],
    };

    expect(transformRequestToAlertDeletePreview(request)).toEqual(expected);
  });

  it('should set default values for thresholds if not provided', () => {
    const request = {
      active_alert_delete_threshold: undefined,
      inactive_alert_delete_threshold: undefined,
      category_ids: [alertDeleteCategoryIds.MANAGEMENT],
    };

    const expected = {
      isActiveAlertDeleteEnabled: false,
      isInactiveAlertDeleteEnabled: false,
      activeAlertDeleteThreshold: 1,
      inactiveAlertDeleteThreshold: 1,
      categoryIds: ['management'],
    };

    expect(transformRequestToAlertDeletePreview(request)).toEqual(expected);
  });
});

describe('transformRequestToAlertDeleteSchedule', () => {
  it('should transform the request to the expected format', () => {
    const request = {
      active_alert_delete_threshold: 5,
      inactive_alert_delete_threshold: 10,
      category_ids: [alertDeleteCategoryIds.MANAGEMENT, alertDeleteCategoryIds.SECURITY_SOLUTION],
      space_ids: ['space1', 'space2'],
    };

    const expected = {
      isActiveAlertDeleteEnabled: true,
      isInactiveAlertDeleteEnabled: true,
      activeAlertDeleteThreshold: 5,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management', 'securitySolution'],
      spaceIds: ['space1', 'space2'],
    };

    expect(transformRequestToAlertDeleteSchedule(request)).toEqual(expected);
  });

  it('should set default values for thresholds if not provided', () => {
    const request = {
      active_alert_delete_threshold: undefined,
      inactive_alert_delete_threshold: undefined,
      category_ids: [alertDeleteCategoryIds.OBSERVABILITY],
      space_ids: ['space1'],
    };

    const expected = {
      isActiveAlertDeleteEnabled: false,
      isInactiveAlertDeleteEnabled: false,
      activeAlertDeleteThreshold: 1,
      inactiveAlertDeleteThreshold: 1,
      categoryIds: ['observability'],
      spaceIds: ['space1'],
    };

    expect(transformRequestToAlertDeleteSchedule(request)).toEqual(expected);
  });
});
