/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NotificationPolicyResponse {
  id: string;
  version?: string;
  name: string;
  description: string;
  workflow_id: string;
  matcher?: string;
  group_by?: string[];
  throttle?: { interval: string };
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}
