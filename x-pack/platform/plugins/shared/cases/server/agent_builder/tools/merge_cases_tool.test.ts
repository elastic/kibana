/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerContext, ToolHandlerReturn } from '@kbn/agent-builder-server';
import type { MergeCasesPreviewResponse, MergeCasesResponse } from '../../../common/types/api';
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import { getNoneConnector } from '../../../common/utils/connectors';
import { mockCases } from '../../mocks';
import { flattenCaseSavedObject } from '../../common/utils';
import type { CasesClient } from '../../client';
import { buildMergeSummary, mergeCasesTool } from './merge_cases_tool';
import { NO_USER_TO_CONFIRM_MESSAGE } from '../utils/confirm_merge';

type ToolCallSource = ToolHandlerContext['callContext']['callSource'];

const emptySummary = {
  total: 0,
  duplicates: 0,
  existing: 0,
  toCopy: 0,
  leftOut: 0,
  notCopied: [],
  max: null,
  overBy: 0,
};

const singleField = <T>(value: T) => ({
  value,
  provenance: 'same' as const,
  sourceCaseId: null,
  options: [],
  hasConflict: false,
});

const previewCase = (id: string, incrementalId: number, status = CaseStatuses.open) => ({
  id,
  version: 'v1',
  title: `Case ${incrementalId}`,
  incrementalId,
  status,
  severity: CaseSeverity.LOW,
  owner: 'securitySolution',
  createdAt: '2026-01-01T00:00:00.000Z',
  totalAlerts: 1,
  template: null,
  merge: null,
});

const buildPreview = (
  overrides: Partial<MergeCasesPreviewResponse> = {}
): MergeCasesPreviewResponse => ({
  cases: [previewCase('case-1', 118), previewCase('case-2', 121, CaseStatuses.closed)],
  destination: { id: null, isNew: true },
  fields: {
    title: singleField('Phishing'),
    description: { ...singleField('Report'), combinedValue: null },
    severity: {
      value: CaseSeverity.HIGH,
      provenance: 'highest',
      sourceCaseId: 'case-1',
      options: [
        { value: CaseSeverity.HIGH, caseIds: ['case-1'] },
        { value: CaseSeverity.LOW, caseIds: ['case-2'] },
      ],
      hasConflict: true,
    },
    category: singleField(null),
    connector: singleField(getNoneConnector()),
    template: { ...singleField(null), candidates: [] },
    customFields: [],
    extendedFields: [],
    tags: { value: [], provenance: 'none', max: 200, overBy: 0 },
    assignees: {
      value: [],
      provenance: 'none',
      max: 10,
      overBy: 0,
      canChange: true,
      unavailableReason: null,
    },
    notCopiedFields: [],
  },
  effectiveTemplate: null,
  conflicts: [],
  limits: [],
  canMerge: true,
  attachments: {
    alerts: { ...emptySummary, toCopy: 3, max: 1000, byRule: [] },
    events: emptySummary,
    attacks: emptySummary,
    observables: { ...emptySummary, toCopy: 1 },
    other: emptySummary,
    files: { total: 2 },
    comments: { total: 0 },
  },
  choices: null,
  ...overrides,
});

const emptyCounts = { alerts: 0, events: 0, attacks: 0, observables: 0, other: 0 };

const mergeResponse: MergeCasesResponse = {
  destination: { id: 'case-3', title: 'Phishing', incrementalId: null, isNew: true },
  sources: [
    {
      caseId: 'case-1',
      title: 'Case 118',
      incrementalId: 118,
      outcome: 'merged',
      closed: true,
      copied: { ...emptyCounts, alerts: 3 },
      existing: emptyCounts,
      leftOut: emptyCounts,
    },
  ],
  failures: [],
};

const buildCasesClient = (preview: MergeCasesPreviewResponse) => {
  const destinationCase = flattenCaseSavedObject({ savedObject: mockCases[0] });
  return {
    cases: {
      mergePreview: jest.fn().mockResolvedValue(preview),
      merge: jest.fn().mockResolvedValue(mergeResponse),
      get: jest.fn().mockResolvedValue(destinationCase),
    },
  } as unknown as CasesClient & {
    cases: { mergePreview: jest.Mock; merge: jest.Mock; get: jest.Mock };
  };
};

const buildContext = (
  overrides: Partial<{
    interactive: boolean;
    executionMode: AgentExecutionMode;
    promptStatus: ConfirmationStatus;
    callSource: ToolCallSource;
  }> = {}
) => {
  const context = {
    request: {},
    logger: loggingSystemMock.createLogger(),
    executionMode: overrides.executionMode ?? AgentExecutionMode.conversation,
    interactivity: { enabled: overrides.interactive ?? true },
    callContext: {
      toolId: 'platform.core.cases.merge',
      toolCallId: 'tc-1',
      callSource: overrides.callSource ?? 'agent',
    },
    prompts: {
      checkConfirmationStatus: jest
        .fn()
        .mockReturnValue({ status: overrides.promptStatus ?? ConfirmationStatus.unprompted }),
      askForConfirmation: jest.fn((definition) => ({
        prompt: { type: 'confirmation', ...definition },
      })),
    },
    attachments: { add: jest.fn().mockResolvedValue({ id: 'attachment-1' }) },
    events: { sendUiEvent: jest.fn() },
  };
  return context as unknown as ToolHandlerContext & { prompts: typeof context.prompts };
};

const run = async (
  casesClient: CasesClient,
  params: Record<string, unknown>,
  context: ToolHandlerContext
) => {
  const tool = mergeCasesTool(jest.fn().mockResolvedValue(casesClient));
  return (await tool.handler(params as never, context)) as ToolHandlerReturn & {
    results?: Array<{ type: string; data: Record<string, unknown> }>;
    prompt?: { message: string; id: string };
  };
};

const params = { case_ids: ['case-1', 'case-2'], fields: { severity: CaseSeverity.HIGH } };

describe('mergeCasesTool', () => {
  it('asks the user to confirm an agent call, showing the preview summary', async () => {
    const casesClient = buildCasesClient(buildPreview());
    const context = buildContext();

    const result = await run(casesClient, params, context);

    expect(casesClient.cases.mergePreview).toHaveBeenCalledWith({
      caseIds: ['case-1', 'case-2'],
      fields: { severity: CaseSeverity.HIGH },
    });
    expect(casesClient.cases.merge).not.toHaveBeenCalled();
    expect(result.prompt?.message).toContain('#118, #121');
    expect(result.prompt?.message).toContain('a new case, "Phishing"');
    expect(result.prompt?.message).toContain('3 alerts, 1 observable');
    expect(result.prompt?.message).toContain('2 files');
    // #121 is already closed, so only #118 closes.
    expect(result.prompt?.message).toContain('**Closes:** #118');
  });

  it('merges once the user accepted and renders the destination', async () => {
    const casesClient = buildCasesClient(buildPreview());
    const context = buildContext({ promptStatus: ConfirmationStatus.accepted });

    const result = await run(casesClient, { ...params, note: 'dupes' }, context);

    expect(casesClient.cases.merge).toHaveBeenCalledWith({
      caseIds: ['case-1', 'case-2'],
      closeSources: true,
      fields: { severity: CaseSeverity.HIGH },
      note: 'dupes',
    });
    expect(result.results?.[0].data).toEqual(
      expect.objectContaining({
        destination: mergeResponse.destination,
        closedCaseIds: ['case-1'],
        attachment_ids: ['attachment-1'],
      })
    );
    expect(context.events.sendUiEvent).toHaveBeenCalled();
  });

  it('does not merge when the user declined', async () => {
    const casesClient = buildCasesClient(buildPreview());
    const result = await run(
      casesClient,
      params,
      buildContext({ promptStatus: ConfirmationStatus.rejected })
    );

    expect(casesClient.cases.merge).not.toHaveBeenCalled();
    expect(result.results?.[0].type).toBe('error');
  });

  it('lists the conflicts with their values and does not ask to confirm', async () => {
    const casesClient = buildCasesClient(
      buildPreview({
        canMerge: false,
        conflicts: [{ field: 'severity', reason: 'differentValues', resolved: false }],
        limits: [{ kind: 'alerts', max: 1000, total: 1240, overBy: 240 }],
      })
    );
    const context = buildContext();

    const result = await run(casesClient, { case_ids: ['case-1', 'case-2'] }, context);

    expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
    expect(casesClient.cases.merge).not.toHaveBeenCalled();
    const message = JSON.stringify(result.results?.[0].data);
    expect(message).toContain('never choose yourself');
    expect(message).toContain(
      'severity: \\"high\\" (#118); \\"low\\" (#121). Suggested: \\"high\\"'
    );
    expect(message).toContain('alerts: 1240 is over the limit of 1000');
    expect(message).toContain('keep_newest_over_limit');
  });

  it('asks for the newest items up to each limit when the user agreed', async () => {
    const casesClient = buildCasesClient(buildPreview());

    await run(casesClient, { ...params, keep_newest_over_limit: true }, buildContext());

    expect(casesClient.cases.mergePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: {
          alerts: { mode: 'newest' },
          observables: { mode: 'newest' },
          other: { mode: 'newest' },
        },
      })
    );
  });

  it('refuses an agent call when no user can confirm', async () => {
    const casesClient = buildCasesClient(buildPreview());

    const result = await run(casesClient, params, buildContext({ interactive: false }));

    expect(casesClient.cases.merge).not.toHaveBeenCalled();
    expect(JSON.stringify(result.results?.[0].data)).toContain(NO_USER_TO_CONFIRM_MESSAGE);
  });

  it('merges a direct call without asking', async () => {
    const casesClient = buildCasesClient(buildPreview());
    const context = buildContext({ callSource: 'user', interactive: false });

    await run(casesClient, params, context);

    expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
    expect(casesClient.cases.merge).toHaveBeenCalled();
  });

  it('asks again when the merge changed after the user answered', async () => {
    const first = buildContext();
    await run(buildCasesClient(buildPreview()), params, first);
    const shownId = first.prompts.askForConfirmation.mock.calls[0][0].id;

    const second = buildContext();
    second.prompts.checkConfirmationStatus.mockImplementation((id: string) => ({
      status: id === shownId ? ConfirmationStatus.accepted : ConfirmationStatus.unprompted,
    }));
    const casesClient = buildCasesClient(buildPreview());
    await run(casesClient, { ...params, close_sources: false }, second);

    expect(casesClient.cases.merge).not.toHaveBeenCalled();
    expect(second.prompts.askForConfirmation.mock.calls[0][0].id).not.toBe(shownId);
  });

  it('summarizes a merge into an existing case that keeps the sources open', () => {
    const summary = buildMergeSummary(
      buildPreview({ destination: { id: 'case-1', isNew: false } }),
      { case_ids: ['case-1', 'case-2'], close_sources: false }
    );

    expect(summary).toContain('**Into:** #118');
    expect(summary).toContain('**Closes:** no cases');
  });
});
