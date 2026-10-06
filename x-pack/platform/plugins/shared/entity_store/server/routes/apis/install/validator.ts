/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EntityType, ALL_ENTITY_TYPES } from '../../../../common/domain/definitions/entity_schema';
import { LogExtractionInstallSchema } from '../utils/log_extraction_validator';
import { HistorySnapshotConfigSchema } from '../utils/history_snapshot_validator';

export const BodySchema = z.object({
  entityTypes: z.array(EntityType).optional().default(ALL_ENTITY_TYPES),
  logExtraction: LogExtractionInstallSchema,
  historySnapshot: HistorySnapshotConfigSchema.optional(),
});
