/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationPolicyDestination } from './notification_policy_data_schema';

export interface NotificationPolicyResponse {
  id: string;
  version?: string;
  name: string;
  description: string;
  destinations: NotificationPolicyDestination[];
  matcher?: string;
  group_by?: string[];
  throttle?: { interval: string };
  auth: {
    owner: string;
    createdByUser: boolean;
  };
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}
