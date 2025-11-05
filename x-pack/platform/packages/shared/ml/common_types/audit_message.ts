/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AuditMessageBase {
  message: string;
  level: string;
  timestamp: number;
  node_name: string;
  text?: string;
  cleared?: boolean;
}

export interface JobMessage extends AuditMessageBase {
  job_id: string;
  clearable?: boolean;
}
