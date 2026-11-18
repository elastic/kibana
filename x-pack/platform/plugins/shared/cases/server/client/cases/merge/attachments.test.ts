/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ALERTS_PER_CASE, SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '../../../../common/constants/attachments';
import type { AttachmentV2, Case } from '../../../../common/types/domain';
import { basicCaseFields } from '../../../services/test_utils';
import {
  alertKey,
  attackKey,
  buildAttachmentPlan,
  collectAlertsToCheck,
  orderCasesForMerge,
  planGainedItems,
} from './attachments';

const makeCase = (id: string, createdAt: string, overrides: Partial<Case> = {}): Case => ({
  ...basicCaseFields,
  id,
  version: `${id}-version`,
  totalComment: 0,
  totalAlerts: 0,
  created_at: createdAt,
  ...overrides,
});

const base = {
  version: 'v',
  owner: SECURITY_SOLUTION_OWNER,
  created_by: { username: 'elastic', full_name: null, email: null },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

const alerts = (
  id: string,
  alertIds: string[],
  { createdAt = '2024-01-01', attackIds }: { createdAt?: string; attackIds?: string[] } = {}
): AttachmentV2 => ({
  ...base,
  id,
  type: SECURITY_ALERT_ATTACHMENT_TYPE,
  attachmentId: alertIds,
  metadata: {
    index: alertIds.map(() => 'alerts-index'),
    rule: { id: 'rule-1', name: 'Rule' },
    ...(attackIds != null ? { sourceAttachmentIds: attackIds } : {}),
  },
  created_at: `${createdAt}T00:00:00.000Z`,
});

const attack = (id: string, attackId: string, createdAt = '2024-01-01'): AttachmentV2 => ({
  ...base,
  id,
  type: SECURITY_ATTACK_ATTACHMENT_TYPE,
  attachmentId: attackId,
  metadata: { index: '.alerts-security.attack.discovery.alerts-default' },
  created_at: `${createdAt}T00:00:00.000Z`,
});

const valueAttachment = (id: string, type: string, data: Record<string, unknown>): AttachmentV2 =>
  ({
    ...base,
    id,
    type,
    data,
    created_at: '2024-01-01T00:00:00.000Z',
  } as unknown as AttachmentV2);

const observable = (id: string, value: string) => ({
  id,
  typeKey: 'ip',
  value,
  description: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: null,
});

const first = makeCase('case-1', '2024-01-01T00:00:00.000Z');
const second = makeCase('case-2', '2024-02-01T00:00:00.000Z');
const third = makeCase('case-3', '2024-03-01T00:00:00.000Z');

describe('orderCasesForMerge', () => {
  it('puts an existing destination first and the rest oldest first', () => {
    expect(orderCasesForMerge([third, first, second], second.id).map(({ id }) => id)).toEqual([
      second.id,
      first.id,
      third.id,
    ]);
    expect(orderCasesForMerge([third, first, second]).map(({ id }) => id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);
  });
});

describe('buildAttachmentPlan', () => {
  const plan = (
    orderedCases: Case[],
    attachments: Record<string, AttachmentV2[]>,
    args: Partial<Parameters<typeof buildAttachmentPlan>[0]> = {}
  ) =>
    buildAttachmentPlan({
      orderedCases,
      attachmentsByCaseId: new Map(Object.entries(attachments)),
      copyObservables: true,
      ...args,
    });

  it('copies each alert once and records which source already had it elsewhere', () => {
    const result = plan([first, second], {
      [first.id]: [alerts('a1', ['alert-1', 'alert-2'])],
      [second.id]: [alerts('a2', ['alert-2', 'alert-3'])],
    });

    expect(result.sources.map(({ items }) => items.map(({ itemCount }) => itemCount))).toEqual([
      [2],
      [1],
    ]);
    expect(result.sources[1].existing.alerts).toBe(1);
    expect(result.summaries.alerts).toEqual(
      expect.objectContaining({ total: 4, duplicates: 1, toCopy: 3, existing: 0, overBy: 0 })
    );
  });

  it('skips what an existing destination already holds', () => {
    const result = plan(
      [first, second],
      {
        [first.id]: [alerts('a1', ['alert-1'])],
        [second.id]: [alerts('a2', ['alert-1', 'alert-2'])],
      },
      { destinationCaseId: first.id }
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual(
      expect.objectContaining({
        caseId: second.id,
        toCopy: expect.objectContaining({ alerts: 1 }),
        existing: expect.objectContaining({ alerts: 1 }),
      })
    );
    expect(result.summaries.alerts.existing).toBe(1);
  });

  it('leaves out the items the request excludes, or keeps only the ones it lists', () => {
    const attachments = {
      [first.id]: [alerts('a1', ['alert-1', 'alert-2'])],
      [second.id]: [alerts('a2', ['alert-3'])],
    };

    const excluded = plan([first, second], attachments, {
      choices: { alerts: { mode: 'exclude', keys: [alertKey('alert-2')] } },
    });
    expect(excluded.summaries.alerts).toEqual(expect.objectContaining({ toCopy: 2, leftOut: 1 }));
    expect(excluded.sources[0].leftOut.alerts).toBe(1);

    const kept = plan([first, second], attachments, {
      choices: { alerts: { mode: 'keep', keys: [alertKey('alert-3')] } },
    });
    expect(kept.summaries.alerts).toEqual(expect.objectContaining({ toCopy: 1, leftOut: 2 }));
  });

  it('reports a kind over its limit and lists every item to choose from', () => {
    const ids = (prefix: string) =>
      Array.from({ length: MAX_ALERTS_PER_CASE }, (_, position) => `${prefix}-${position}`);
    const result = plan([first, second], {
      [first.id]: [alerts('a1', ids('first'))],
      [second.id]: [alerts('a2', ['second-0'])],
    });

    expect(result.limits).toEqual([
      { kind: 'alerts', max: MAX_ALERTS_PER_CASE, total: MAX_ALERTS_PER_CASE + 1, overBy: 1 },
    ]);
    expect(result.choices.alerts).toHaveLength(MAX_ALERTS_PER_CASE + 1);
    expect(result.choices.alerts[0]).toEqual(
      expect.objectContaining({
        key: alertKey('first-0'),
        sourceCaseId: first.id,
        ruleName: 'Rule',
      })
    );
  });

  it('keeps the newest alerts that fit when asked to', () => {
    const ids = (prefix: string) =>
      Array.from({ length: MAX_ALERTS_PER_CASE }, (_, position) => `${prefix}-${position}`);
    const result = plan(
      [first, second],
      {
        [first.id]: [alerts('a1', ids('old'), { createdAt: '2024-01-01' })],
        [second.id]: [alerts('a2', ['new-0'], { createdAt: '2024-02-01' })],
      },
      { choices: { alerts: { mode: 'newest' } } }
    );

    expect(result.limits).toEqual([]);
    expect(result.summaries.alerts).toEqual(
      expect.objectContaining({ toCopy: MAX_ALERTS_PER_CASE, leftOut: 1 })
    );
    expect(result.sources[1].toCopy.alerts).toBe(1);
  });

  describe('attacks', () => {
    const attachments = {
      [first.id]: [
        attack('t1', 'attack-1'),
        alerts('a1', ['alert-1', 'alert-2'], { attackIds: ['attack-1'] }),
        alerts('a2', ['alert-3']),
      ],
    };

    it('copies an attack before the alerts it brought', () => {
      const result = plan([first, second], attachments);

      expect(result.sources[0].items.map(({ kind }) => kind)).toEqual([
        'attacks',
        'alerts',
        'alerts',
      ]);
      expect(result.choices.attacks).toEqual([
        expect.objectContaining({
          key: attackKey('attack-1'),
          alertKeys: [alertKey('alert-1'), alertKey('alert-2')],
        }),
      ]);
      // An attack's alerts follow it, so they are not offered on their own.
      expect(result.choices.alerts.map(({ key }) => key)).toEqual([alertKey('alert-3')]);
    });

    it('leaves out an attack with the alerts only it brought', () => {
      const result = plan([first, second], attachments, {
        choices: { attacks: { mode: 'exclude', keys: [attackKey('attack-1')] } },
      });

      expect(result.summaries.attacks).toEqual(expect.objectContaining({ toCopy: 0, leftOut: 1 }));
      expect(result.summaries.alerts).toEqual(expect.objectContaining({ toCopy: 1, leftOut: 2 }));
    });

    it('keeps an alert the analyst also attached on its own', () => {
      const result = plan(
        [first, second],
        {
          [first.id]: [
            attack('t1', 'attack-1'),
            alerts('a1', ['alert-1'], { attackIds: ['attack-1'] }),
          ],
          [second.id]: [alerts('a2', ['alert-1'])],
        },
        { choices: { attacks: { mode: 'exclude', keys: [attackKey('attack-1')] } } }
      );

      expect(result.summaries.alerts.toCopy).toBe(1);
    });
  });

  it('leaves out alerts the checks reject, with why', () => {
    const result = plan(
      [first, second],
      { [first.id]: [alerts('a1', ['alert-1', 'alert-2', 'alert-3'])] },
      {
        ineligibleAlerts: new Map([
          ['alert-1', 'alertCaseLimit'],
          ['alert-2', 'alertNotAuthorized'],
        ]),
      }
    );

    expect(result.summaries.alerts).toEqual(
      expect.objectContaining({
        toCopy: 1,
        leftOut: 0,
        notCopied: [
          { reason: 'alertCaseLimit', count: 1 },
          { reason: 'alertNotAuthorized', count: 1 },
        ],
      })
    );
    expect(result.sources[0].leftOut.alerts).toBe(2);
    expect(result.choices.alerts.map(({ alertId }) => alertId)).toEqual(['alert-3']);
  });

  it('dedupes observables by type and value, and leaves them all out below Platinum', () => {
    const cases = [
      { ...first, observables: [observable('o1', '1.1.1.1')] },
      { ...second, observables: [observable('o2', '1.1.1.1'), observable('o3', '2.2.2.2')] },
    ];

    const copied = plan(cases, {});
    expect(copied.sources[1].observables.map(({ value }) => value)).toEqual(['2.2.2.2']);
    expect(copied.sources[1].existing.observables).toBe(1);

    const unlicensed = plan(cases, {}, { copyObservables: false });
    expect(unlicensed.summaries.observables).toEqual(
      expect.objectContaining({ toCopy: 0, notCopied: [{ reason: 'license', count: 2 }] })
    );
  });

  it('counts files and comments without copying them', () => {
    const result = plan([first, second], {
      [first.id]: [
        valueAttachment('c1', COMMENT_ATTACHMENT_TYPE, { content: 'note' }),
        valueAttachment('f1', FILE_ATTACHMENT_TYPE, {}),
      ],
    });

    expect(result).toEqual(expect.objectContaining({ files: 1, comments: 1 }));
    expect(result.sources[0].items).toEqual([]);
  });

  it('does not copy value attachments again from a source already linked to the destination', () => {
    const lens = valueAttachment('l1', LENS_ATTACHMENT_TYPE, { state: {} });
    const attachments = { [second.id]: [lens] };

    expect(
      plan([first, second], attachments, { destinationCaseId: first.id }).sources[0].items
    ).toHaveLength(1);
    expect(
      plan([first, second], attachments, {
        destinationCaseId: first.id,
        alreadyMergedSourceIds: new Set([second.id]),
      }).sources[0].existing.other
    ).toBe(1);
  });
});

describe('collectAlertsToCheck', () => {
  it('splits the alerts to copy from the alerts the destination already holds', () => {
    const result = collectAlertsToCheck({
      orderedCases: [first, second],
      attachmentsByCaseId: new Map([
        [first.id, [alerts('a1', ['alert-1', 'alert-9'])]],
        [second.id, [alerts('a2', ['alert-1', 'alert-2'])]],
      ]),
      destinationCaseId: first.id,
    });

    expect(result.candidates.map(({ id }) => id)).toEqual(['alert-2']);
    // Only destination alerts a source also brings: a rerun may have to link those.
    expect(result.linked.map(({ id }) => id)).toEqual(['alert-1']);
  });
});

describe('planGainedItems', () => {
  it('copies only what the source gained and the destination does not hold', () => {
    const result = buildAttachmentPlan({
      orderedCases: [first, second],
      attachmentsByCaseId: new Map([
        [first.id, [alerts('a1', ['alert-1'])]],
        [second.id, [alerts('a2', ['alert-2'])]],
      ]),
      copyObservables: true,
    });

    const gained = planGainedItems({
      source: result.sources[0],
      attachments: [alerts('a1', ['alert-1']), alerts('a3', ['alert-2', 'alert-3'])],
      observables: [observable('o1', '1.1.1.1')],
      seenKeys: result.seenKeys,
      copyObservables: true,
    });

    expect(gained.items).toEqual([expect.objectContaining({ kind: 'alerts', itemCount: 1 })]);
    expect(gained.counts).toEqual(expect.objectContaining({ alerts: 1, observables: 1 }));
    expect(gained.attachmentIds).toEqual(['a3']);
    expect(gained.observableIds).toEqual(['o1']);
  });
});
