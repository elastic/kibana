/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
} from '@kbn/agent-builder-common/attachments';
import {
  buildAttachmentSubtitle,
  buildConversationAttachmentDisplayModel,
  getDisplayableConversationAttachments,
  resolveAddedByLabel,
} from './conversation_attachment_display_utils';

const makeAttachment = (overrides: Partial<VersionedAttachment> = {}): VersionedAttachment => ({
  id: 'alert-89a4f2',
  type: 'security.alert',
  current_version: 1,
  active: true,
  description: 'Suspicious encrypted file activity',
  versions: [
    {
      version: 1,
      data: {
        attachmentLabel: 'Suspicious encrypted file activity',
        alert: 'Host: SRVWIN04\nRule: Test rule',
      },
      created_at: '2026-06-02T18:00:00.000Z',
      content_hash: 'abc',
    },
  ],
  ...overrides,
});

describe('getDisplayableConversationAttachments', () => {
  it('excludes hidden and inactive attachments', () => {
    const attachments = [
      makeAttachment({ id: 'visible' }),
      makeAttachment({ id: 'hidden', hidden: true }),
      makeAttachment({ id: 'deleted', active: false }),
    ];

    expect(getDisplayableConversationAttachments(attachments).map((a) => a.id)).toEqual([
      'visible',
    ]);
  });
});

describe('buildAttachmentSubtitle', () => {
  it('prefers header subtitle when provided', () => {
    expect(
      buildAttachmentSubtitle({
        type: 'security.alert',
        data: {},
        headerSubtitle: 'Custom subtitle',
      })
    ).toBe('Custom subtitle');
  });

  it('builds a Security host subtitle from alert payload', () => {
    expect(
      buildAttachmentSubtitle({
        type: 'security.alert',
        data: { alert: 'Host: SRVWIN04\nRule: Test' },
      })
    ).toContain('Security');
    expect(
      buildAttachmentSubtitle({
        type: 'security.alert',
        data: { alert: 'Host: SRVWIN04\nRule: Test' },
      })
    ).toContain('SRVWIN04');
  });
});

describe('resolveAddedByLabel', () => {
  it('falls back to the conversation owner when there are no refs', () => {
    expect(
      resolveAddedByLabel({
        attachmentId: 'alert-1',
        conversationOwnerName: 'Dima',
      })
    ).toBe('Dima');
  });

  it('maps agent refs to Agent', () => {
    expect(
      resolveAddedByLabel({
        attachmentId: 'alert-1',
        conversationOwnerName: 'Dima',
        rounds: [
          {
            id: 'round-1',
            input: {
              message: 'test',
              attachment_refs: [
                {
                  attachment_id: 'alert-1',
                  version: 1,
                  operation: ATTACHMENT_REF_OPERATION.created,
                  actor: ATTACHMENT_REF_ACTOR.agent,
                },
              ],
            },
          } as never,
        ],
      })
    ).toBe('Agent');
  });
});

describe('buildConversationAttachmentDisplayModel', () => {
  it('builds title, badge, and subtitle for security alerts', () => {
    const model = buildConversationAttachmentDisplayModel({
      attachment: makeAttachment(),
      conversationOwnerName: 'Dima',
    });

    expect(model.title).toContain('alert-89a4f2');
    expect(model.title).toContain('Suspicious encrypted file activity');
    expect(model.typeBadge).toBe('ALERT');
    expect(model.subtitle).toContain('added by Dima');
    expect(model.isPersistent).toBe(true);
  });

  it('includes sourceLink from the attachment UI definition', () => {
    const model = buildConversationAttachmentDisplayModel({
      attachment: makeAttachment(),
      uiDefinition: {
        getLabel: () => 'Security Alert',
        getSourceLink: () => ({ href: '/app/security/alerts/redirect/alert-id' }),
      },
    });

    expect(model.sourceLink).toEqual({ href: '/app/security/alerts/redirect/alert-id' });
  });
});
