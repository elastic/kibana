/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import type { MergeCasesResponse } from '../../../common/types/api';
import type { CasesClient } from '../../client';
import { createTypedApiError } from '../../common/api_errors';
import { createCaseError } from '../../common/error';
import { formatMergeBlockedProblems, mergeCasesStepDefinition } from './merge_cases';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.mergeCases' });

const emptyCounts = { alerts: 0, events: 0, attacks: 0, observables: 0, other: 0 };

const mergeResponse: MergeCasesResponse = {
  destination: { id: 'case-3', title: 'Merged', incrementalId: null, isNew: true },
  sources: [
    {
      caseId: 'case-1',
      title: 'First',
      incrementalId: 1,
      outcome: 'merged',
      closed: true,
      copied: { ...emptyCounts, alerts: 3 },
      existing: emptyCounts,
      leftOut: emptyCounts,
    },
    {
      caseId: 'case-2',
      title: 'Second',
      incrementalId: 2,
      outcome: 'notMerged',
      closed: false,
      copied: emptyCounts,
      existing: emptyCounts,
      leftOut: emptyCounts,
    },
  ],
  failures: [{ step: 'copy', caseId: 'case-2', reason: 'write failed' }],
};

const setup = (merge: jest.Mock) => {
  const getCasesClient = jest
    .fn()
    .mockResolvedValue({ cases: { merge } } as unknown as CasesClient);
  return mergeCasesStepDefinition(getCasesClient);
};

describe('mergeCasesStepDefinition', () => {
  it('maps the input to the merge request and closes the sources by default', async () => {
    const merge = jest.fn().mockResolvedValue(mergeResponse);
    const definition = setup(merge);

    await definition.handler(
      createContext({
        case_ids: ['case-1', 'case-2'],
        fields: { title: 'Merged', severity: 'high' },
        attachments: { alerts: { mode: 'newest' } },
        note: 'Merged by a workflow',
      })
    );

    expect(definition.id).toBe('cases.mergeCases');
    expect(merge).toHaveBeenCalledWith({
      caseIds: ['case-1', 'case-2'],
      closeSources: true,
      fields: { title: 'Merged', severity: 'high' },
      attachments: { alerts: { mode: 'newest' } },
      note: 'Merged by a workflow',
    });
  });

  it('passes the destination and close_sources through', async () => {
    const merge = jest.fn().mockResolvedValue(mergeResponse);
    const definition = setup(merge);

    await definition.handler(
      createContext({
        case_ids: ['case-1', 'case-2'],
        destination_case_id: 'case-1',
        close_sources: false,
      })
    );

    expect(merge).toHaveBeenCalledWith({
      caseIds: ['case-1', 'case-2'],
      destinationCaseId: 'case-1',
      closeSources: false,
    });
  });

  it('returns a partial success as output, with the closed cases', async () => {
    const merge = jest.fn().mockResolvedValue(mergeResponse);
    const definition = setup(merge);

    const result = await definition.handler(createContext({ case_ids: ['case-1', 'case-2'] }));

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual({ ...mergeResponse, closedCaseIds: ['case-1'] });
  });

  it('fails with every conflict and limit when the merge is blocked', async () => {
    const blocked = createTypedApiError({
      statusCode: 400,
      message: 'blocked',
      attributes: {
        code: CASES_API_ERROR_CODES.MERGE_BLOCKED,
        conflicts: [
          { field: 'severity', reason: 'differentValues' },
          { field: 'extendedFields', key: 'risk_as_keyword', label: 'Risk', reason: 'required' },
        ],
        limits: [{ kind: 'alerts', max: 1000, total: 1240, overBy: 240 }],
      },
    });
    const merge = jest
      .fn()
      .mockRejectedValue(createCaseError({ message: 'Failed to merge cases', error: blocked }));
    const definition = setup(merge);

    const result = await definition.handler(createContext({ case_ids: ['case-1', 'case-2'] }));

    expect(result.output).toBeUndefined();
    expect(result.error?.message).toContain('nothing changed');
    expect(result.error?.message).toContain(
      'severity: the cases hold different values, set fields.severity'
    );
    expect(result.error?.message).toContain('extendedFields.risk_as_keyword (Risk)');
    expect(result.error?.message).toContain(
      'alerts: 1240 is over the limit of 1000, leave out 240'
    );
  });

  it('fails with the error message for any other failure', async () => {
    const merge = jest.fn().mockRejectedValue(new Error('Case case-1 not found'));
    const definition = setup(merge);

    const result = await definition.handler(createContext({ case_ids: ['case-1', 'case-2'] }));

    expect(result.error?.message).toBe(
      'Cases case-1, case-2 could not be merged. Reason: Case case-1 not found'
    );
  });

  it('formats an invalid value with its details', () => {
    expect(
      formatMergeBlockedProblems({
        conflicts: [
          {
            field: 'customFields',
            key: 'priority',
            reason: 'invalidValue',
            message: 'not an option',
          },
        ],
        limits: [],
      })
    ).toEqual([
      'customFields.priority: the value is not valid for the destination template (not an option)',
    ]);
  });
});
