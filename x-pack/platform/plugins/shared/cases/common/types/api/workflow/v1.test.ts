/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  CASES_WORKFLOW_EXECUTION_SOURCE,
  CasesWorkflowExecutionMetadataSchema,
} from './v1';

const validMetadata = {
  schemaVersion: CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  source: CASES_WORKFLOW_EXECUTION_SOURCE,
  caseId: 'case-1',
  origin: {
    type: 'cases.case' as const,
    id: 'case-1',
  },
};

describe('CasesWorkflowExecutionMetadataSchema', () => {
  it('accepts valid Cases workflow execution metadata', () => {
    expect(CasesWorkflowExecutionMetadataSchema.parse(validMetadata)).toEqual(validMetadata);
  });

  it.each([
    ['schema version', { ...validMetadata, schemaVersion: 2 }],
    ['source', { ...validMetadata, source: 'securitySolution' }],
    ['case id', { ...validMetadata, caseId: '' }],
    [
      'origin type',
      {
        ...validMetadata,
        origin: { type: 'cases.comment', id: 'comment-1' },
      },
    ],
  ])('rejects an invalid %s', (_, metadata) => {
    expect(CasesWorkflowExecutionMetadataSchema.safeParse(metadata).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(
      CasesWorkflowExecutionMetadataSchema.safeParse({ ...validMetadata, product: 'cases' }).success
    ).toBe(false);
  });
});
