/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  CASES_WORKFLOW_EXECUTION_SOURCE,
  MAX_CASES_PER_WORKFLOW_RUN,
} from '../../../constants';
import { CasesWorkflowExecutionMetadataSchema } from './v1';

const validMetadata = {
  schemaVersion: CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  source: CASES_WORKFLOW_EXECUTION_SOURCE,
  caseIds: ['case-1'],
  origin: {
    type: 'cases.case' as const,
    caseId: 'case-1',
  },
};

describe('CasesWorkflowExecutionMetadataSchema', () => {
  it('accepts valid Cases workflow execution metadata for a single case', () => {
    expect(CasesWorkflowExecutionMetadataSchema.parse(validMetadata)).toEqual(validMetadata);
  });

  it('accepts metadata with no origin (list-surface / bulk run)', () => {
    const { origin: _omitted, ...withoutOrigin } = validMetadata;
    expect(CasesWorkflowExecutionMetadataSchema.parse(withoutOrigin)).toEqual(withoutOrigin);
  });

  it(`accepts metadata with up to ${MAX_CASES_PER_WORKFLOW_RUN} case ids (the cap)`, () => {
    const ids = Array.from({ length: MAX_CASES_PER_WORKFLOW_RUN }, (_, i) => `case-${i}`);
    const result = CasesWorkflowExecutionMetadataSchema.safeParse({
      ...validMetadata,
      caseIds: ids,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ['schema version', { ...validMetadata, schemaVersion: 2 }],
    ['source namespace', { ...validMetadata, source: 'securitySolution' }],
    ['empty caseIds array', { ...validMetadata, caseIds: [] }],
    [
      'origin type',
      {
        ...validMetadata,
        origin: { type: 'cases.comment', caseId: 'comment-1' },
      },
    ],
    [
      'legacy origin id field',
      {
        ...validMetadata,
        origin: { type: 'cases.case', id: 'case-1' },
      },
    ],
  ])('rejects an invalid %s', (_, metadata) => {
    expect(CasesWorkflowExecutionMetadataSchema.safeParse(metadata).success).toBe(false);
  });

  it(`rejects more than ${MAX_CASES_PER_WORKFLOW_RUN} case ids`, () => {
    const ids = Array.from({ length: MAX_CASES_PER_WORKFLOW_RUN + 1 }, (_, i) => `case-${i}`);
    expect(
      CasesWorkflowExecutionMetadataSchema.safeParse({ ...validMetadata, caseIds: ids }).success
    ).toBe(false);
  });

  it('rejects an invalid (empty) case id within the array', () => {
    expect(
      CasesWorkflowExecutionMetadataSchema.safeParse({
        ...validMetadata,
        caseIds: [''],
      }).success
    ).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(
      CasesWorkflowExecutionMetadataSchema.safeParse({ ...validMetadata, product: 'cases' }).success
    ).toBe(false);
  });
});
