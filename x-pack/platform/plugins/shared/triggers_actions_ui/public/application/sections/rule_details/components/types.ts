/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertStatusValues } from '@kbn/alerting-plugin/common';

export interface AlertListItem {
  alert: string;
  status: AlertStatusValues;
  start?: Date;
  duration: number;
  isMuted: boolean;
  sortPriority: number;
  flapping: boolean;
  maintenanceWindowIds?: string[];
  tracked: boolean;
}

export interface RefreshToken {
  resolve: () => void;
  reject: () => void;
}
