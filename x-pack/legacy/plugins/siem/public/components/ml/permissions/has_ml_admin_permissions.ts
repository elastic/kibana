/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlCapabilities } from '../types';

export const hasMlAdminPermissions = (capabilities: MlCapabilities): boolean =>
  getDataFeedPermissions(capabilities) &&
  getJobPermissions(capabilities) &&
  getFilterPermissions(capabilities) &&
  getCalendarPermissions(capabilities);

const getDataFeedPermissions = ({ capabilities }: MlCapabilities): boolean =>
  capabilities.canGetDatafeeds &&
  capabilities.canStartStopDatafeed &&
  capabilities.canUpdateDatafeed &&
  capabilities.canPreviewDatafeed;

const getJobPermissions = ({ capabilities }: MlCapabilities): boolean =>
  capabilities.canCreateJob &&
  capabilities.canGetJobs &&
  capabilities.canUpdateJob &&
  capabilities.canDeleteJob &&
  capabilities.canOpenJob &&
  capabilities.canCloseJob &&
  capabilities.canForecastJob;

const getFilterPermissions = ({ capabilities }: MlCapabilities) =>
  capabilities.canGetFilters && capabilities.canCreateFilter && capabilities.canDeleteFilter;

const getCalendarPermissions = ({ capabilities }: MlCapabilities) =>
  capabilities.canCreateCalendar && capabilities.canGetCalendars && capabilities.canDeleteCalendar;
