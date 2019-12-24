/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Http {
  request?: { method: string; [key: string]: unknown };
  response?: { status_code: number; [key: string]: unknown };
  version?: string;
}
