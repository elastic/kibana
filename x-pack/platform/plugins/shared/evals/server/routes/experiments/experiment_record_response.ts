/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationExperimentRecord } from '@kbn/evals-common';
import type { ExperimentRecordDocument } from '../../storage/experiments/experiment_record_client';

/** Shapes a stored experiment record for the API, leaving out internal space assignments. */
export const toExperimentRecordResponse = (
  record: ExperimentRecordDocument
): EvaluationExperimentRecord => ({
  id: record.id,
  experiment_id: record.experiment_id,
  name: record.name,
  ...(record.description !== undefined ? { description: record.description } : {}),
  protocol: record.protocol,
  status: record.status,
  ...(record.started_at ? { started_at: record.started_at } : {}),
  ...(record.completed_at ? { completed_at: record.completed_at } : {}),
  ...(record.provenance ? { provenance: record.provenance } : {}),
  ...(record.completeness ? { completeness: record.completeness } : {}),
  ...(record.error !== undefined ? { error: record.error } : {}),
  created_at: record.created_at,
  updated_at: record.updated_at,
});
