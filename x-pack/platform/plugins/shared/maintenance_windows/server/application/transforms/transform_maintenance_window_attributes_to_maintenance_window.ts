/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import { getMaintenanceWindowDateAndStatus } from '../lib/get_maintenance_window_date_and_status';
import type { MaintenanceWindow } from '../types';

export interface TransformMaintenanceWindowAttributesMaintenanceWindowParams {
  attributes: MaintenanceWindowAttributes;
  id: string;
}

export const transformMaintenanceWindowAttributesToMaintenanceWindow = (
  params: TransformMaintenanceWindowAttributesMaintenanceWindowParams
): MaintenanceWindow => {
  const { id, attributes } = params;
  const { events, expirationDate } = attributes;
  const { eventStartTime, eventEndTime, status } = getMaintenanceWindowDateAndStatus({
    events,
    expirationDate: new Date(expirationDate),
    dateToCompare: new Date(),
    enabled: attributes.enabled,
  });

  return {
    id,
    title: attributes.title,
    enabled: attributes.enabled,
    duration: attributes.duration,
    expirationDate: attributes.expirationDate,
    events: attributes.events,
    rRule: attributes.rRule,
    createdBy: attributes.createdBy,
    updatedBy: attributes.updatedBy,
    createdAt: attributes.createdAt,
    updatedAt: attributes.updatedAt,
    eventStartTime,
    eventEndTime,
    status,
    ...(attributes.categoryIds !== undefined ? { categoryIds: attributes.categoryIds } : {}),
    ...(attributes.scopedQuery !== undefined ? { scopedQuery: attributes.scopedQuery } : {}),
    schedule: attributes.schedule,
    ...(attributes.scope !== undefined ? { scope: attributes.scope } : {}),
  };
};
