/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImprovementEnvelope } from '../../../../common/http_api/improvements';

/** A proposed `add_ki` suggestion, the shape the panel and row are exercised with by default. */
export const buildImprovement = (
  overrides: Partial<ImprovementEnvelope> = {}
): ImprovementEnvelope => ({
  improvement_id: 'imp-1',
  ai_index_id: 'my-ai-index',
  status: 'proposed',
  action: 'add_ki',
  title: 'Document the refund window',
  rationale: 'Three retrievals for "refund" returned nothing.',
  signal_tags: ['empty_retrieval'],
  payload: { ki: { type: 'document', title: 'Refunds', content: '30 days.' } },
  confidence: 0.82,
  suggested_at: '2026-02-01T10:00:00.000Z',
  ...overrides,
});
