/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hasMlAdminPermissions } from './has_ml_admin_permissions';
import { cloneDeep } from 'lodash/fp';
import { emptyMlCapabilities } from '../empty_ml_capabilities';

describe('has_ml_admin_permissions', () => {
  let mlCapabilities = cloneDeep(emptyMlCapabilities);

  beforeEach(() => {
    mlCapabilities = cloneDeep(emptyMlCapabilities);
  });

  test('it returns false when everything is false', () => {
    const permissions = hasMlAdminPermissions(mlCapabilities);
    expect(permissions).toEqual(false);
  });

  test('it returns true when all the correct boolean switches are flipped', () => {
    mlCapabilities.capabilities.canGetDatafeeds = true;
    mlCapabilities.capabilities.canStartStopDatafeed = true;
    mlCapabilities.capabilities.canUpdateDatafeed = true;
    mlCapabilities.capabilities.canPreviewDatafeed = true;
    mlCapabilities.capabilities.canCreateJob = true;
    mlCapabilities.capabilities.canGetJobs = true;
    mlCapabilities.capabilities.canUpdateJob = true;
    mlCapabilities.capabilities.canDeleteJob = true;
    mlCapabilities.capabilities.canOpenJob = true;
    mlCapabilities.capabilities.canCloseJob = true;
    mlCapabilities.capabilities.canForecastJob = true;
    mlCapabilities.capabilities.canGetFilters = true;
    mlCapabilities.capabilities.canCreateFilter = true;
    mlCapabilities.capabilities.canDeleteFilter = true;
    mlCapabilities.capabilities.canCreateCalendar = true;
    mlCapabilities.capabilities.canGetCalendars = true;
    mlCapabilities.capabilities.canDeleteCalendar = true;
    const permissions = hasMlAdminPermissions(mlCapabilities);
    expect(permissions).toEqual(true);
  });
});
