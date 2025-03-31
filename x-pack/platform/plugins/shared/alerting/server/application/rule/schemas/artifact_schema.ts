/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const investigationGuideSchema = schema.object({
  blob: schema.string(),
});

export const dashboardSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
  })
);

export const artifactSchema = schema.object({
  dashboards: schema.maybe(dashboardSchema),
  investigation_guide: schema.maybe(investigationGuideSchema),
});
