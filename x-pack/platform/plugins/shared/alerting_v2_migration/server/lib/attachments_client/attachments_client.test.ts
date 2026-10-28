/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => ({
  v4: () => 'generated-attachment-id',
}));

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { createAttachmentsClient } from './attachments_client';

const ruleData: Partial<RuleAttachmentData> = {
  kind: 'alert',
  metadata: { name: 'High CPU' },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '15m' },
  query: { base: 'FROM metrics-* | LIMIT 10' },
};

const record = (
  id: string,
  type: string,
  dataByVersion: unknown[],
  extra: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id,
  type,
  current_version: dataByVersion.length,
  versions: dataByVersion.map((data, index) => ({
    version: index + 1,
    data,
    created_at: '2026-10-28T00:00:00.000Z',
    content_hash: `hash-${index + 1}`,
  })),
  ...extra,
});

describe('createAttachmentsClient', () => {
  let attachments: ToolHandlerContextMock['attachments'];

  beforeEach(() => {
    attachments = agentBuilderMocks.tools.createHandlerContext().attachments;
    attachments.add.mockResolvedValue(record('added', RULE_ATTACHMENT_TYPE, [ruleData]));
    attachments.update.mockResolvedValue(
      record('updated', RULE_ATTACHMENT_TYPE, [ruleData, ruleData])
    );
  });

  describe('rules.get', () => {
    it('returns the latest version of a rule attachment', () => {
      const renamed = { ...ruleData, metadata: { name: 'Renamed' } };
      attachments.getAttachmentRecord.mockReturnValue(
        record('rule-att', RULE_ATTACHMENT_TYPE, [ruleData, renamed], {
          description: 'Rule: Renamed',
          origin: 'rule-1',
        })
      );

      expect(createAttachmentsClient(attachments).rules.get('rule-att')).toEqual({
        id: 'rule-att',
        type: RULE_ATTACHMENT_TYPE,
        version: 2,
        description: 'Rule: Renamed',
        origin: 'rule-1',
        data: renamed,
      });
    });

    it('returns undefined for missing attachments and attachments of another type', () => {
      const { rules } = createAttachmentsClient(attachments);

      expect(rules.get('missing')).toBeUndefined();

      attachments.getAttachmentRecord.mockReturnValue(
        record('text-att', 'text', [{ content: 'hello' }])
      );
      expect(rules.get('text-att')).toBeUndefined();
    });

    it('returns undefined when the latest payload is not a rule', () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('rule-att', RULE_ATTACHMENT_TYPE, [{ metadata: { name: 'Incomplete' } }])
      );

      expect(createAttachmentsClient(attachments).rules.get('rule-att')).toBeUndefined();
    });
  });

  describe('rules.list', () => {
    it('returns only active rule attachments with a valid payload', () => {
      attachments.getActive.mockReturnValue([
        record('rule-att', RULE_ATTACHMENT_TYPE, [ruleData]),
        record('text-att', 'text', [{ content: 'hello' }]),
        record('broken-att', RULE_ATTACHMENT_TYPE, [{ metadata: { name: 'Incomplete' } }]),
      ]);

      expect(createAttachmentsClient(attachments).rules.list()).toEqual([
        {
          id: 'rule-att',
          type: RULE_ATTACHMENT_TYPE,
          version: 1,
          description: undefined,
          origin: undefined,
          data: ruleData,
        },
      ]);
    });
  });

  describe('rules.getDraft', () => {
    it('yields a new, empty draft when no id is given', () => {
      expect(createAttachmentsClient(attachments).rules.getDraft()).toEqual({
        attachmentId: 'generated-attachment-id',
        isNew: true,
        origin: undefined,
        data: {},
      });
    });

    it('loads an existing rule attachment for editing', () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('rule-att', RULE_ATTACHMENT_TYPE, [ruleData], { origin: 'rule-1' })
      );

      expect(createAttachmentsClient(attachments).rules.getDraft('rule-att')).toEqual({
        attachmentId: 'rule-att',
        isNew: false,
        origin: 'rule-1',
        data: ruleData,
      });
    });

    it('throws when the attachment is of another type', () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('text-att', 'text', [{ content: 'hello' }])
      );

      expect(() => createAttachmentsClient(attachments).rules.getDraft('text-att')).toThrow(
        'Attachment "text-att" is of type "text", expected "platform.alerting.rule".'
      );
    });
  });

  describe('rules.saveDraft', () => {
    it('adds a new draft as a rule attachment', async () => {
      const { rules } = createAttachmentsClient(attachments);

      await rules.saveDraft(rules.getDraft(), ruleData);

      expect(attachments.add).toHaveBeenCalledWith({
        id: 'generated-attachment-id',
        type: RULE_ATTACHMENT_TYPE,
        description: 'Rule: High CPU',
        data: ruleData,
      });
      expect(attachments.update).not.toHaveBeenCalled();
    });

    it('updates an existing draft', async () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('rule-att', RULE_ATTACHMENT_TYPE, [ruleData])
      );
      const { rules } = createAttachmentsClient(attachments);
      const renamed = { ...ruleData, metadata: { name: 'Renamed' } };

      await rules.saveDraft(rules.getDraft('rule-att'), renamed);

      expect(attachments.update).toHaveBeenCalledWith('rule-att', {
        data: renamed,
        description: 'Rule: Renamed',
      });
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('throws when the attachment could not be persisted', async () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('rule-att', RULE_ATTACHMENT_TYPE, [ruleData])
      );
      attachments.update.mockResolvedValue(undefined);
      const { rules } = createAttachmentsClient(attachments);

      await expect(rules.saveDraft(rules.getDraft('rule-att'), ruleData)).rejects.toThrow(
        'Failed to persist rule attachment "rule-att".'
      );
    });
  });
});
