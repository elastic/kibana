/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '../client';
import { getCaseOutcome } from './case_outcome';

const closedAt = '2026-11-06T12:00:00.000Z';
const closer = { username: 'jordan', full_name: 'Jordan', email: null, profile_uid: 'u-jordan' };

const theCase = (overrides: Record<string, unknown> = {}) => ({
  id: 'case-1',
  title: 'Credential dumping on fin-ws-07',
  description: 'procdump.exe read lsass.exe memory.',
  owner: 'securitySolution',
  status: 'closed',
  severity: 'high',
  incremental_id: 1287,
  created_at: '2026-11-06T10:00:00.000Z',
  closed_at: closedAt,
  closed_by: closer,
  close_reason: 'false_positive',
  human_verdict: 'false_positive',
  ai_verdict: { verdict: 'true_positive', confidence: 0.8, actor: { type: 'agent' } },
  source: 'alertzero',
  template: { id: 'system-ai-investigation', version: 1 },
  observables: [
    { typeKey: 'observable-type-hostname', value: 'fin-ws-07', description: null },
    { typeKey: 'observable-type-file-hash', value: 'abc123', description: null },
  ],
  ...overrides,
});

const setup = ({
  caseOverrides,
  publishOutcomes,
}: { caseOverrides?: Record<string, unknown>; publishOutcomes?: boolean } = {}) => {
  const client = {
    cases: { get: jest.fn().mockResolvedValue(theCase(caseOverrides)) },
    configure: {
      get: jest
        .fn()
        .mockResolvedValue(
          publishOutcomes === undefined ? [{}] : [{ knowledge: { publishOutcomes } }]
        ),
    },
    attachments: {
      find: jest.fn().mockResolvedValue({
        data: [
          {
            type: 'comment',
            data: { content: 'Admin ran procdump to debug a crash; approved change CHG-221.' },
            created_at: '2026-11-06T11:58:30.000Z',
            created_by: closer,
          },
          {
            type: 'comment',
            data: { content: 'An older comment that must never be published.' },
            created_at: '2026-11-06T10:30:00.000Z',
            created_by: closer,
          },
          {
            type: 'security.alert',
            attachmentId: ['alert-1'],
            metadata: {
              index: ['.alerts-security.alerts-default'],
              rule: { id: 'r1', name: 'Potential Credential Access via LSASS Memory Dump' },
            },
          },
          {
            type: 'agentic.investigation',
            attachmentId: 'inv-1',
            metadata: { title: 'LSASS access by procdump' },
          },
        ],
      }),
    },
  };
  return client as unknown as CasesClient & typeof client;
};

const run = (client: CasesClient, contextEngineOn = true) =>
  getCaseOutcome({
    client,
    caseId: 'case-1',
    spaceId: 'default',
    isContextEngineEnabled: async () => contextEngineOn,
  });

describe('getCaseOutcome', () => {
  it('builds one knowledge item per closed case, with its outcome and match keys', async () => {
    const result = await run(setup());

    expect(result.publish).toBe(true);
    if (!result.publish) return;
    expect(result.ki_id).toBe('case:case-1');
    expect(result.ki).toMatchObject({
      type: 'case_outcome',
      title: 'Credential dumping on fin-ws-07',
      description: 'Admin ran procdump to debug a crash; approved change CHG-221.',
      attributes: {
        case_id: 'case-1',
        incremental_id: 1287,
        close_reason: 'false_positive',
        human_verdict: 'false_positive',
        ai_verdict: 'true_positive',
        ai_confidence: 0.8,
        agreement: false,
        severity: 'high',
        template_id: 'system-ai-investigation',
        source: 'alertzero',
        rule_names: ['Potential Credential Access via LSASS Memory Dump'],
        hosts: ['fin-ws-07'],
        observables: ['fin-ws-07', 'abc123'],
        time_to_resolve: 7200,
      },
      references: [
        { uri: 'case://case-1', relation: 'derived_from' },
        { uri: 'alert://.alerts-security.alerts-default/alert-1', relation: 'relates_to' },
      ],
    });
    expect(result.ki.tags).toEqual(
      expect.arrayContaining([
        'case_outcome',
        'space:default',
        'owner:securitySolution',
        'close_reason:false_positive',
        'rule:Potential Credential Access via LSASS Memory Dump',
        'host:fin-ws-07',
      ])
    );
    expect(result.ki.content).toContain('## Closing notes');
    expect(result.ki.content).toContain('LSASS access by procdump');
    // Only the closer's comment written just before the close is published.
    expect(result.ki.content).not.toContain('older comment');
  });

  it('never publishes a restricted case, and retracts anything published before', async () => {
    const client = setup({ caseOverrides: { access: { mode: 'restricted' } } });

    const result = await run(client);

    expect(result).toEqual({
      publish: false,
      retract: true,
      ki_id: 'case:case-1',
      skip_reason: 'restricted',
    });
    expect(client.attachments.find).not.toHaveBeenCalled();
  });

  it('retracts on reopen, and skips when the space turned publishing or the context engine off', async () => {
    expect(await run(setup({ caseOverrides: { status: 'open' } }))).toMatchObject({
      publish: false,
      retract: true,
      skip_reason: 'not_closed',
    });
    expect(await run(setup({ publishOutcomes: false }))).toMatchObject({
      publish: false,
      retract: false,
      skip_reason: 'publishing_off',
    });
    expect(await run(setup(), false)).toMatchObject({
      publish: false,
      retract: false,
      skip_reason: 'context_engine_off',
    });
  });

  it('publishes only Security outcomes, since agents read them outside Cases owner privileges', async () => {
    expect(await run(setup({ caseOverrides: { owner: 'observability' } }))).toMatchObject({
      publish: false,
      retract: false,
      skip_reason: 'owner_not_published',
    });
  });

  it('publishes no comment when the case closed without a close reason (not from the close modal)', async () => {
    const result = await run(setup({ caseOverrides: { close_reason: null, human_verdict: null } }));

    expect(result.publish).toBe(true);
    if (!result.publish) return;
    expect(result.ki.content).not.toContain('## Closing notes');
    expect(result.ki.content).not.toContain('CHG-221');
  });
});
