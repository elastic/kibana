/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlCapabilities } from '../types';

export const hasMlAdminPermissions = (capabilities: MlCapabilities): boolean => {
  const dataFeedPermissions = getDataFeedPermissions(capabilities);
  const jobPermissions = getJobPermissions(capabilities);
  const filterPermissions = getFilterPermissions(capabilities);
  const calendarPermissions = getCalendarPermissions(capabilities);

  const canRead =
    capabilities.isPlatinumOrTrialLicense &&
    capabilities.mlFeatureEnabledInSpace &&
    capabilities.capabilities.canFindFileStructure &&
    dataFeedPermissions &&
    jobPermissions &&
    filterPermissions &&
    calendarPermissions;
  return canRead;
};

const getDataFeedPermissions = ({ capabilities }: MlCapabilities) => {
  return (
    capabilities.canGetDatafeeds &&
    capabilities.canStartStopDatafeed &&
    capabilities.canUpdateDatafeed &&
    capabilities.canPreviewDatafeed
  );
};

const getJobPermissions = ({ capabilities }: MlCapabilities) => {
  return (
    capabilities.canCreateJob &&
    capabilities.canGetJobs &&
    capabilities.canUpdateJob &&
    capabilities.canDeleteJob &&
    capabilities.canOpenJob &&
    capabilities.canCloseJob &&
    capabilities.canForecastJob
  );
};

const getFilterPermissions = ({ capabilities }: MlCapabilities) => {
  return capabilities.canGetFilters && capabilities.canCreateFilter && capabilities.canDeleteFilter;
};

const getCalendarPermissions = ({ capabilities }: MlCapabilities) => {
  return (
    capabilities.canCreateCalendar && capabilities.canGetCalendars && capabilities.canDeleteCalendar
  );
};
