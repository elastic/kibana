/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createFlyoutGroupedAttachmentsRegistry } from './registry';
import { selectGroupedAttachments } from './select_grouped_attachments';
import { FlyoutGroupedAttachments } from './types';

const createAttachment = (
  id: string,
  type: string,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id,
  type,
  current_version: 1,
  versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: id }],
  ...overrides,
});

const renderer = () => null;

const createRegistry = () => {
  const registry = createFlyoutGroupedAttachmentsRegistry();
  registry.register(FlyoutGroupedAttachments.ALERTS, ['security.alert'], renderer);
  registry.register(FlyoutGroupedAttachments.RULES, ['security.rule'], renderer);
  return registry;
};

const groupIds = (selected: ReturnType<typeof selectGroupedAttachments>) =>
  selected.map(({ group, attachments }) => [group, attachments.map(({ id }) => id)]);

describe('selectGroupedAttachments', () => {
  it('follows the requested order, not the registration order', () => {
    const selected = selectGroupedAttachments(
      [createAttachment('alert-1', 'security.alert'), createAttachment('rule-1', 'security.rule')],
      createRegistry(),
      [FlyoutGroupedAttachments.RULES, FlyoutGroupedAttachments.ALERTS]
    );

    expect(groupIds(selected)).toEqual([
      [FlyoutGroupedAttachments.RULES, ['rule-1']],
      [FlyoutGroupedAttachments.ALERTS, ['alert-1']],
    ]);
  });

  it('skips unregistered groups and groups without attachments', () => {
    const selected = selectGroupedAttachments(
      [createAttachment('alert-1', 'security.alert')],
      createRegistry(),
      [
        FlyoutGroupedAttachments.ATTACKS,
        FlyoutGroupedAttachments.RULES,
        FlyoutGroupedAttachments.ALERTS,
      ]
    );

    expect(groupIds(selected)).toEqual([[FlyoutGroupedAttachments.ALERTS, ['alert-1']]]);
  });

  it('skips hidden and inactive attachments', () => {
    const selected = selectGroupedAttachments(
      [
        createAttachment('alert-1', 'security.alert'),
        createAttachment('alert-hidden', 'security.alert', { hidden: true }),
        createAttachment('alert-inactive', 'security.alert', { active: false }),
      ],
      createRegistry(),
      [FlyoutGroupedAttachments.ALERTS]
    );

    expect(groupIds(selected)).toEqual([[FlyoutGroupedAttachments.ALERTS, ['alert-1']]]);
  });

  it('returns nothing without attachments', () => {
    expect(
      selectGroupedAttachments(undefined, createRegistry(), [FlyoutGroupedAttachments.ALERTS])
    ).toEqual([]);
  });
});
