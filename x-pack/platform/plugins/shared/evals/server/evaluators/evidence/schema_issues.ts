/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

export const getIssuePath = (path: PropertyKey[]): string =>
  path.map((segment) => String(segment)).join('.') || '<root>';

export const formatEvidenceSchemaIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => `${getIssuePath(issue.path)}: ${issue.message}`).join('; ');
