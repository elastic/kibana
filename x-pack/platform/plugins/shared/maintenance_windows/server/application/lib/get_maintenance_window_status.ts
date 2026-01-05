/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowStatus } from '../../../common';

export const getMaintenanceWindowStatus = () => {
  return {
    [MaintenanceWindowStatus.Running]: '(maintenance-window.attributes.events: "now")',
    [MaintenanceWindowStatus.Upcoming]:
      '(not maintenance-window.attributes.events: "now" and maintenance-window.attributes.events > "now")',
    [MaintenanceWindowStatus.Finished]:
      '(not maintenance-window.attributes.events >= "now" and maintenance-window.attributes.expirationDate >"now")',
    [MaintenanceWindowStatus.Archived]: '(maintenance-window.attributes.expirationDate < "now")',
    [MaintenanceWindowStatus.Disabled]: '(maintenance-window.attributes.enabled: false)',
  };
};
