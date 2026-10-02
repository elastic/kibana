/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { OBSERVABILITY_OWNER } from '../../common/constants';
import {
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
} from '../../common/constants/workflow';
import type { CaseWorkflowRunOrigin } from '../../common/types/api';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import {
  CASES_LIST_WORKFLOW_RUN_TELEMETRY_ORIGIN,
  getCaseWorkflowRunTelemetry,
  useCaseWorkflowRunTelemetry,
} from './use_case_workflow_run_telemetry';

jest.mock('../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

describe('getCaseWorkflowRunTelemetry', () => {
  it.each<[string, CaseWorkflowRunOrigin, { origin: string; itemCount: number }]>([
    [
      'a case',
      { type: CASE_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1' },
      { origin: CASE_WORKFLOW_ORIGIN_TYPE, itemCount: 1 },
    ],
    [
      'a single observable',
      { type: OBSERVABLE_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1', observableId: 'obs-1' },
      { origin: OBSERVABLE_WORKFLOW_ORIGIN_TYPE, itemCount: 1 },
    ],
    [
      'an observable selection',
      { type: OBSERVABLES_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1', observableIds: ['o-1', 'o-2'] },
      { origin: OBSERVABLES_WORKFLOW_ORIGIN_TYPE, itemCount: 2 },
    ],
    [
      'a single attachment',
      {
        type: ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        attachmentType: 'security.alert',
        attachmentId: 'alert-1',
      },
      { origin: 'security.alert', itemCount: 1 },
    ],
    [
      'an attachment selection',
      {
        type: ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        attachmentType: 'security.event',
        attachmentIds: ['event-1', 'event-2', 'event-3'],
      },
      { origin: 'security.event', itemCount: 3 },
    ],
  ])('maps a run from %s', (_label, origin, expected) => {
    expect(getCaseWorkflowRunTelemetry(origin, 1)).toEqual(expected);
  });

  it('reports a cases-list run over the selected cases when there is no origin', () => {
    expect(getCaseWorkflowRunTelemetry(undefined, 4)).toEqual({
      origin: CASES_LIST_WORKFLOW_RUN_TELEMETRY_ORIGIN,
      itemCount: 4,
    });
  });
});

describe('useCaseWorkflowRunTelemetry', () => {
  it('adds the registered owner from the cases context', () => {
    jest.mocked(useCasesContext).mockReturnValue({
      owner: [OBSERVABILITY_OWNER],
    } as ReturnType<typeof useCasesContext>);

    const { result } = renderHook(() =>
      useCaseWorkflowRunTelemetry({ type: CASE_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1' }, 1)
    );

    expect(result.current).toEqual({
      origin: CASE_WORKFLOW_ORIGIN_TYPE,
      itemCount: 1,
      owner: OBSERVABILITY_OWNER,
    });
  });

  it('reports an unknown owner when the context owner is not registered', () => {
    jest.mocked(useCasesContext).mockReturnValue({
      owner: ['not-a-solution'],
    } as ReturnType<typeof useCasesContext>);

    const { result } = renderHook(() => useCaseWorkflowRunTelemetry(undefined, 2));

    expect(result.current.owner).toBe('unknown');
  });
});
