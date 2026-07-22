/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { resolveRuleAttachmentData } from './attachments';

const ruleAttachment = (
  id: string,
  versions: Array<{ version: number; data: Record<string, unknown> }>,
  currentVersion?: number
): VersionedAttachment =>
  ({
    id,
    type: RULE_ATTACHMENT_TYPE,
    current_version: currentVersion ?? versions[versions.length - 1].version,
    versions: versions.map((v) => ({
      version: v.version,
      data: v.data,
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: `hash-${v.version}`,
    })),
  } as VersionedAttachment);

describe('resolveRuleAttachmentData', () => {
  it('prefers the attachment id/version from the render_attachment tag', () => {
    const attachments = [
      ruleAttachment('a1', [
        { version: 1, data: { kind: 'alert', schedule: { lookback: '1m' } } },
        { version: 2, data: { kind: 'alert', schedule: { lookback: '5m' } } },
      ]),
      ruleAttachment('a2', [{ version: 1, data: { kind: 'signal' } }]),
    ];

    const data = resolveRuleAttachmentData(attachments, [
      'Here is your rule:\n<render_attachment id="a1" version="2" />',
    ]);

    expect(data).toEqual({ kind: 'alert', schedule: { lookback: '5m' } });
  });

  it('falls back to the latest rule attachment when no render tag is present', () => {
    const attachments = [
      ruleAttachment('old', [{ version: 1, data: { kind: 'alert', id: 'old' } }]),
      ruleAttachment('new', [{ version: 1, data: { kind: 'alert', id: 'new' } }]),
    ];

    expect(resolveRuleAttachmentData(attachments, ['Done.'])).toEqual({
      kind: 'alert',
      id: 'new',
    });
  });

  it('returns undefined when there are no rule attachments', () => {
    expect(
      resolveRuleAttachmentData([], ['<render_attachment id="x" version="1" />'])
    ).toBeUndefined();
  });
});
