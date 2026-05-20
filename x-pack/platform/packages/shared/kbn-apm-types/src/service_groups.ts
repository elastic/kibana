/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ServiceGroup {
  groupName: string;
  kuery: string;
  description?: string;
  color?: string;
}

export interface SavedServiceGroup extends ServiceGroup {
  id: string;
  updatedAt: number;
}
