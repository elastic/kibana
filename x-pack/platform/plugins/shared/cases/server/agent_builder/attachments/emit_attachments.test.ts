/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  emitCaseAttachment,
  emitFromStepResult,
  injectAttachmentIds,
  toCaseAttachmentData,
} from './emit_attachments';
import { createCaseAttachmentType } from './case_attachment_type';
import {
  CASE_ATTACHMENT_TYPE,
  CASES_ATTACHMENT_TYPE,
} from '../../../common/types/agent_builder/attachment_schemas';
import { CASES_UPDATED_UI_EVENT } from '../../../common/types/agent_builder/ui_events';
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import type { Case } from '../../../common/types/domain';
import type { CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';

const buildCase = (id = 'case-1'): Case =>
  ({
    id,
    incremental_id: 1,
    title: `Case ${id}`,
    description: 'desc',
    status: CaseStatuses.open,
    severity: CaseSeverity.LOW,
    owner: 'securitySolution',
    tags: [],
    assignees: [],
    totalAlerts: 0,
    totalComment: 0,
    total_observables: 0,
    connector: { id: 'none', name: 'none', type: '.none', fields: null },
    settings: { syncAlerts: false },
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: { username: 'test', full_name: null, email: null },
    updated_at: null,
    updated_by: null,
    closed_at: null,
    closed_by: null,
    external_service: null,
    customFields: [],
    observables: [],
    category: null,
    duration: null,
    version: 'abc',
  } as unknown as Case);

const buildAttachments = () => ({
  add: jest.fn().mockResolvedValue({ id: 'att-1' }),
  getActive: jest.fn().mockReturnValue([]),
  update: jest.fn().mockResolvedValue(undefined),
});

const buildStoredCaseAttachment = (attachmentId: string, caseData: CaseAttachmentData) => ({
  id: attachmentId,
  type: CASE_ATTACHMENT_TYPE,
  active: true,
  current_version: 2,
  versions: [
    { version: 1, data: { ...caseData, total_observables: null } },
    { version: 2, data: caseData },
  ],
});

const buildEvents = () => ({
  sendUiEvent: jest.fn(),
});

// ---------------------------------------------------------------------------
// emitFromStepResult
// ---------------------------------------------------------------------------

describe('emitFromStepResult', () => {
  it('emits a single-case attachment when result contains { case: Case }', async () => {
    const attachments = buildAttachments();
    const events = buildEvents();
    const ids = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: buildCase('c1') } }],
    });

    expect(attachments.add).toHaveBeenCalledTimes(1);
    const callArg = attachments.add.mock.calls[0][0];
    expect(callArg.type).toBe(CASE_ATTACHMENT_TYPE);
    expect(ids).toEqual(['att-1']);
    expect(events.sendUiEvent).toHaveBeenCalledWith(CASES_UPDATED_UI_EVENT, { caseIds: ['c1'] });
  });

  it('emits a single-case attachment when { cases } contains exactly one case', async () => {
    const attachments = buildAttachments();
    const events = buildEvents();
    const ids = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { cases: [buildCase('c1')] } }],
    });

    expect(attachments.add).toHaveBeenCalledTimes(1);
    const callArg = attachments.add.mock.calls[0][0];
    expect(callArg.type).toBe(CASE_ATTACHMENT_TYPE);
    expect(ids).toEqual(['att-1']);
    expect(events.sendUiEvent).toHaveBeenCalledWith(CASES_UPDATED_UI_EVENT, { caseIds: ['c1'] });
  });

  it('emits a cases-list attachment when { cases } contains multiple cases', async () => {
    const attachments = buildAttachments();
    const events = buildEvents();
    const ids = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { cases: [buildCase('c1'), buildCase('c2')] } }],
    });

    expect(attachments.add).toHaveBeenCalledTimes(1);
    const callArg = attachments.add.mock.calls[0][0];
    expect(callArg.type).toBe(CASES_ATTACHMENT_TYPE);
    expect(ids).toEqual(['att-1']);
    expect(events.sendUiEvent).toHaveBeenCalledWith(CASES_UPDATED_UI_EVENT, {
      caseIds: ['c1', 'c2'],
    });
  });

  it('returns empty array when result data has no case or cases field', async () => {
    const attachments = buildAttachments();
    const events = buildEvents();
    const ids = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { something_else: true } }],
    });

    expect(attachments.add).not.toHaveBeenCalled();
    expect(ids).toEqual([]);
    expect(events.sendUiEvent).not.toHaveBeenCalled();
  });

  it('returns empty array when results is empty', async () => {
    const attachments = buildAttachments();
    const events = buildEvents();
    const ids = await emitFromStepResult({ attachments, events } as never, { results: [] });

    expect(attachments.add).not.toHaveBeenCalled();
    expect(ids).toEqual([]);
    expect(events.sendUiEvent).not.toHaveBeenCalled();
  });

  it('returns empty array when cases array is empty', async () => {
    const attachments = buildAttachments();
    const events = buildEvents();
    const ids = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { cases: [] } }],
    });

    expect(attachments.add).not.toHaveBeenCalled();
    expect(ids).toEqual([]);
    expect(events.sendUiEvent).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// emitCaseAttachment (dedupe per case id)
// ---------------------------------------------------------------------------

describe('emitCaseAttachment', () => {
  const buildRealManager = () =>
    createAttachmentStateManager([], {
      getTypeDefinition: (type) =>
        type === CASE_ATTACHMENT_TYPE ? (createCaseAttachmentType() as never) : undefined,
    });

  it('updates the existing attachment when the same case is emitted again', async () => {
    const attachments = buildRealManager();
    const events = buildEvents();
    const created = buildCase('c1');
    const withObservables = { ...buildCase('c1'), total_observables: 2 } as Case;

    const first = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: created } }],
    });
    const second = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: withObservables } }],
    });

    expect(second).toEqual(first);
    const active = attachments.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(first[0]);
    expect(active[0].versions).toHaveLength(2);
    expect(active[0].versions[1].data).toMatchObject({ id: 'c1', total_observables: 2 });
  });

  it('keeps totalAttachments and url from a UI-originated attachment when updating it', async () => {
    const attachments = buildRealManager();
    const events = buildEvents();
    const { id } = await attachments.add({
      type: CASE_ATTACHMENT_TYPE,
      data: {
        ...toCaseAttachmentData(buildCase('c1'), 'https://example.com/case/c1'),
        totalAttachments: 3,
      },
    });

    await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: { ...buildCase('c1'), total_observables: 2 } } }],
    });

    const [active] = attachments.getActive();
    expect(active.id).toBe(id);
    expect(active.versions).toHaveLength(2);
    expect(active.versions[1].data).toMatchObject({
      id: 'c1',
      total_observables: 2,
      totalAttachments: 3,
      url: 'https://example.com/case/c1',
    });
  });

  it('refreshes totalAttachments from the case comments after an attachment write step', async () => {
    const attachments = buildRealManager();
    const events = buildEvents();
    await attachments.add({
      type: CASE_ATTACHMENT_TYPE,
      data: { ...toCaseAttachmentData(buildCase('c1')), totalAttachments: 3 },
    });
    const withFourComments = {
      ...buildCase('c1'),
      comments: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    } as unknown as Case;

    await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: withFourComments } }],
    });

    expect(attachments.getActive()[0].versions[1].data).toMatchObject({ totalAttachments: 4 });
  });

  it('lets a fresh totalAttachments override the stored one', async () => {
    const attachments = buildRealManager();
    await attachments.add({
      type: CASE_ATTACHMENT_TYPE,
      data: { ...toCaseAttachmentData(buildCase('c1')), totalAttachments: 3 },
    });

    await emitCaseAttachment(attachments, {
      ...toCaseAttachmentData(buildCase('c1')),
      totalAttachments: 5,
    });

    expect(attachments.getActive()[0].versions[1].data).toMatchObject({ totalAttachments: 5 });
  });

  it('adds only one attachment when two emits for the same new case run in parallel', async () => {
    const attachments = buildRealManager();
    const events = buildEvents();

    const [first, second] = await Promise.all([
      emitFromStepResult({ attachments, events } as never, {
        results: [{ data: { case: buildCase('c1') } }],
      }),
      emitFromStepResult({ attachments, events } as never, {
        results: [{ data: { case: { ...buildCase('c1'), total_observables: 2 } } }],
      }),
    ]);

    expect(second).toEqual(first);
    const active = attachments.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].versions).toHaveLength(2);
  });

  it('adds only one attachment when parallel tool calls emit the same new case through distinct forToolCall views', async () => {
    // run_tool.ts hands each tool call `manager.forToolCall(toolCallId)`: a distinct object over
    // the one shared conversation state.
    const manager = buildRealManager();
    const toolCallA = manager.forToolCall('tool-call-a');
    const toolCallB = manager.forToolCall('tool-call-b');
    expect(toolCallA).not.toBe(toolCallB);

    const [first, second] = await Promise.all([
      emitCaseAttachment(toolCallA, toCaseAttachmentData(buildCase('c1'))),
      emitCaseAttachment(toolCallB, {
        ...toCaseAttachmentData(buildCase('c1')),
        total_observables: 2,
      }),
    ]);

    expect(second).toBe(first);
    const active = manager.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(first);
    expect(active[0].versions).toHaveLength(2);
    expect(active[0].versions[1].data).toMatchObject({ id: 'c1', total_observables: 2 });
    // The duplicate that lost the race is gone from the state and never surfaced as a change.
    expect(manager.getAll()).toHaveLength(1);
    expect(manager.drainChanges().map(({ kind, attachment_id: id }) => ({ kind, id }))).toEqual([
      { kind: 'added', id: first },
      { kind: 'updated', id: first },
    ]);
  });

  it('keeps one attachment per case when several tool calls emit several cases in parallel', async () => {
    const manager = buildRealManager();

    const ids = await Promise.all(
      ['c1', 'c2', 'c1', 'c2', 'c1'].map((caseId, index) =>
        emitCaseAttachment(
          manager.forToolCall(`tool-call-${index}`),
          toCaseAttachmentData(buildCase(caseId))
        )
      )
    );

    expect(ids[2]).toBe(ids[0]);
    expect(ids[4]).toBe(ids[0]);
    expect(ids[3]).toBe(ids[1]);
    expect(ids[0]).not.toBe(ids[1]);
    expect(manager.getActive().map(({ id }) => id)).toEqual([ids[0], ids[1]]);
  });

  it('keeps conversations independent: the same case id in two managers gets one attachment each', async () => {
    const conversationA = buildRealManager();
    const conversationB = buildRealManager();

    const [idA, idB] = await Promise.all([
      emitCaseAttachment(conversationA.forToolCall('a'), toCaseAttachmentData(buildCase('c1'))),
      emitCaseAttachment(conversationB.forToolCall('b'), toCaseAttachmentData(buildCase('c1'))),
    ]);

    expect(idA).not.toBe(idB);
    expect(conversationA.getActive().map(({ id }) => id)).toEqual([idA]);
    expect(conversationB.getActive().map(({ id }) => id)).toEqual([idB]);
    expect(conversationA.getActive()[0].versions).toHaveLength(1);
    expect(conversationB.getActive()[0].versions).toHaveLength(1);
  });

  it('updates the existing attachment, carrying url and totalAttachments, when a later tool call emits the case', async () => {
    const manager = buildRealManager();
    await emitCaseAttachment(manager.forToolCall('a'), {
      ...toCaseAttachmentData(buildCase('c1'), 'https://example.com/case/c1'),
      totalAttachments: 3,
    });

    await Promise.all([
      emitCaseAttachment(manager.forToolCall('b'), {
        ...toCaseAttachmentData(buildCase('c1')),
        total_observables: 2,
      }),
      emitCaseAttachment(manager.forToolCall('c'), {
        ...toCaseAttachmentData(buildCase('c1')),
        total_observables: 3,
      }),
    ]);

    const [active] = manager.getActive();
    expect(manager.getActive()).toHaveLength(1);
    expect(active.versions).toHaveLength(3);
    expect(getLatestVersion(active)?.data).toMatchObject({
      url: 'https://example.com/case/c1',
      totalAttachments: 3,
    });
  });

  it('does not block later emits for the case when an add through another tool call view failed', async () => {
    const manager = buildRealManager();
    const failing = manager.forToolCall('failing');
    jest.spyOn(failing, 'add').mockRejectedValueOnce(new Error('boom'));

    const results = await Promise.allSettled([
      emitCaseAttachment(failing, toCaseAttachmentData(buildCase('c1'))),
      emitCaseAttachment(manager.forToolCall('ok'), toCaseAttachmentData(buildCase('c1'))),
    ]);
    const [rejected, fulfilled] = results;
    const later = await emitCaseAttachment(
      manager.forToolCall('later'),
      toCaseAttachmentData(buildCase('c1'))
    );

    expect(rejected.status).toBe('rejected');
    expect(fulfilled.status).toBe('fulfilled');
    expect(manager.getActive().map(({ id }) => id)).toEqual([later]);
  });

  it('still emits for the same case after a parallel emit failed', async () => {
    const attachments = buildRealManager();
    jest.spyOn(attachments, 'add').mockRejectedValueOnce(new Error('boom'));

    const results = await Promise.allSettled([
      emitCaseAttachment(attachments, toCaseAttachmentData(buildCase('c1'))),
      emitCaseAttachment(attachments, toCaseAttachmentData(buildCase('c1'))),
    ]);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('fulfilled');
    expect(attachments.getActive()).toHaveLength(1);
  });

  it('adds a new attachment for a different case id', async () => {
    const attachments = buildAttachments();
    attachments.add.mockResolvedValueOnce({ id: 'att-1' }).mockResolvedValueOnce({ id: 'att-2' });
    const events = buildEvents();

    await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: buildCase('c1') } }],
    });
    attachments.getActive.mockReturnValue([
      buildStoredCaseAttachment('att-1', toCaseAttachmentData(buildCase('c1'))),
    ]);
    const ids = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: buildCase('c2') } }],
    });

    expect(attachments.add).toHaveBeenCalledTimes(2);
    expect(attachments.update).not.toHaveBeenCalled();
    expect(ids).toEqual(['att-2']);
  });

  it('adds a new attachment when the prior attachment for the case was deleted', async () => {
    const attachments = buildRealManager();
    const events = buildEvents();

    const [firstId] = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: buildCase('c1') } }],
    });
    attachments.delete(firstId);
    const [secondId] = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: buildCase('c1') } }],
    });

    expect(secondId).not.toBe(firstId);
    expect(attachments.getActive().map(({ id }) => id)).toEqual([secondId]);
    expect(attachments.getAll()).toHaveLength(2);
  });

  it('does not update an active attachment of a different type that carries the same data id', async () => {
    const attachments = buildAttachments();
    const events = buildEvents();
    attachments.add.mockResolvedValue({ id: 'att-new' });
    attachments.getActive.mockReturnValue([
      {
        ...buildStoredCaseAttachment('att-other', toCaseAttachmentData(buildCase('c1'))),
        type: CASES_ATTACHMENT_TYPE,
      },
    ]);

    const ids = await emitFromStepResult({ attachments, events } as never, {
      results: [{ data: { case: buildCase('c1') } }],
    });

    expect(attachments.update).not.toHaveBeenCalled();
    expect(attachments.add).toHaveBeenCalledTimes(1);
    expect(attachments.add.mock.calls[0][0].type).toBe(CASE_ATTACHMENT_TYPE);
    expect(ids).toEqual(['att-new']);
  });
});

// ---------------------------------------------------------------------------
// injectAttachmentIds
// ---------------------------------------------------------------------------

describe('injectAttachmentIds', () => {
  const baseResult = () => ({
    results: [{ type: 'other' as const, data: { total: 1 } }],
  });

  it('adds attachment_ids to the first result data', () => {
    const result = injectAttachmentIds(baseResult(), ['att-1', 'att-2']);
    expect(result.results[0].data).toMatchObject({ attachment_ids: ['att-1', 'att-2'] });
  });

  it('preserves existing data fields', () => {
    const result = injectAttachmentIds(baseResult(), ['att-1']);
    expect(result.results[0].data).toMatchObject({ total: 1 });
  });

  it('returns the original result unchanged when attachment_ids is empty', () => {
    const original = baseResult();
    const result = injectAttachmentIds(original, []);
    expect(result).toBe(original);
  });

  it('does not mutate additional results beyond the first', () => {
    const twoResults = {
      results: [
        { type: 'other' as const, data: { first: true } },
        { type: 'other' as const, data: { second: true } },
      ],
    };
    const result = injectAttachmentIds(twoResults, ['att-1']);
    expect(result.results[1].data).toEqual({ second: true });
  });
});

// ---------------------------------------------------------------------------
// toCaseAttachmentData
// ---------------------------------------------------------------------------

describe('toCaseAttachmentData', () => {
  it('maps Case fields to CaseAttachmentData', () => {
    const c = buildCase('abc');
    const data = toCaseAttachmentData(c, 'https://example.com/case/abc');

    expect(data.id).toBe('abc');
    expect(data.title).toBe('Case abc');
    expect(data.status).toBe(CaseStatuses.open);
    expect(data.url).toBe('https://example.com/case/abc');
  });

  it('sets totalAttachments from comments only when the case includes them', () => {
    const withComments = {
      ...buildCase(),
      comments: [{ id: 'a' }, { id: 'b' }],
    } as unknown as Case;
    const withEmptyComments = { ...buildCase(), comments: [] } as unknown as Case;

    expect(toCaseAttachmentData(withComments).totalAttachments).toBe(2);
    // Cases loaded without comments come back with `comments: []` (flattenCaseSavedObject default).
    expect(toCaseAttachmentData(withEmptyComments)).not.toHaveProperty('totalAttachments');
    expect(toCaseAttachmentData(buildCase())).not.toHaveProperty('totalAttachments');
  });

  it('sets url to null when not provided', () => {
    const data = toCaseAttachmentData(buildCase(), null);
    expect(data.url).toBeNull();
  });

  it('maps connector name from connector object', () => {
    const c = {
      ...buildCase(),
      connector: { id: 'c1', name: 'Jira', type: '.jira', fields: null },
    } as unknown as Case;
    const data = toCaseAttachmentData(c);
    expect(data.connector_name).toBe('Jira');
  });

  it('sets connector_name to null when connector name is absent', () => {
    const data = toCaseAttachmentData(buildCase());
    expect(data.connector_name).toBe('none');
  });
});
