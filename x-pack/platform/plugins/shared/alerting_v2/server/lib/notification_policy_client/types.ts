/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CreateNotificationPolicyData {
  name: string;
  description: string;
  workflow_id: string;
}

export interface UpdateNotificationPolicyData {
  name?: string;
  description?: string;
  workflow_id?: string;
}

export interface UpdateNotificationPolicyParams {
  data: UpdateNotificationPolicyData;
  options: { id: string; version: string };
}

export interface CreateNotificationPolicyParams {
  data: CreateNotificationPolicyData;
  options?: { id?: string };
}

export interface NotificationPolicyResponse {
  id: string;
  version?: string;
  name: string;
  description: string;
  workflow_id: string;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
}
