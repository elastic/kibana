/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MaintenanceWindow } from '../types';
import { MaintenanceWindowAttributes } from '../../../data/maintenance_window/types';
import { getMaintenanceWindowDateAndStatus } from '../lib';

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
  };
};
