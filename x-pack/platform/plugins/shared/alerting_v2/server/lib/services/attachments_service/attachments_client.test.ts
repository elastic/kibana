/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => ({
  v4: () => 'generated-attachment-id',
}));

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerContextMock } from '@kbn/agent-builder-plugin/server/mocks';
import { ACTION_POLICY_ATTACHMENT_TYPE, RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { createAttachmentsClient } from './attachments_client';

const record = (
  id: string,
  type: string,
  data: Record<string, unknown>,
  extra: Record<string, unknown> = {}
) =>
  ({
    id,
    type,
    current_version: 1,
    versions: [{ version: 1, data }],
    ...extra,
  } as never);

describe('createAttachmentsClient', () => {
  let attachments: ToolHandlerContextMock['attachments'];

  beforeEach(() => {
    attachments = agentBuilderMocks.tools.createHandlerContext().attachments;
    attachments.add.mockResolvedValue({ id: 'added', current_version: 1 } as never);
    attachments.update.mockResolvedValue({ id: 'updated', current_version: 2 } as never);
  });

  describe('list', () => {
    it('returns only active attachments of the client type with their latest data', () => {
      attachments.getActive.mockReturnValue([
        record('wf-att-1', WORKFLOW_YAML_ATTACHMENT_TYPE, { yaml: 'a', workflowId: 'wf-1' }),
        record('rule-att', RULE_ATTACHMENT_TYPE, { metadata: { name: 'r' } }),
        {
          id: 'wf-att-2',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          current_version: 2,
          versions: [
            { version: 1, data: { yaml: 'old' } },
            { version: 2, data: { yaml: 'new' } },
          ],
        } as never,
      ]);

      const { workflows } = createAttachmentsClient(attachments);

      expect(workflows.list()).toEqual([
        {
          id: 'wf-att-1',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          version: 1,
          description: undefined,
          origin: undefined,
          data: { yaml: 'a', workflowId: 'wf-1' },
        },
        {
          id: 'wf-att-2',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          version: 2,
          description: undefined,
          origin: undefined,
          data: { yaml: 'new' },
        },
      ]);
    });

    it('supports arbitrary attachment types via ofType', () => {
      attachments.getActive.mockReturnValue([
        record('dash-att', 'dashboard', { title: 'Overview' }, { origin: 'dash-so-id' }),
        record('rule-att', RULE_ATTACHMENT_TYPE, {}),
      ]);

      const dashboards = createAttachmentsClient(attachments).ofType<{ title: string }>(
        'dashboard'
      );

      expect(dashboards.type).toBe('dashboard');
      expect(dashboards.list().map(({ id, origin, data }) => ({ id, origin, data }))).toEqual([
        { id: 'dash-att', origin: 'dash-so-id', data: { title: 'Overview' } },
      ]);
    });
  });

  describe('get', () => {
    it('returns the attachment when it matches the client type', () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('rule-att', RULE_ATTACHMENT_TYPE, { metadata: { name: 'r' } }, { origin: 'r-1' })
      );

      expect(createAttachmentsClient(attachments).rules.get('rule-att')).toEqual(
        expect.objectContaining({
          id: 'rule-att',
          origin: 'r-1',
          data: { metadata: { name: 'r' } },
        })
      );
    });

    it('returns undefined for attachments of another type', () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('wf-att', WORKFLOW_YAML_ATTACHMENT_TYPE, { yaml: '' })
      );

      expect(createAttachmentsClient(attachments).rules.get('wf-att')).toBeUndefined();
    });
  });

  describe('getDraft', () => {
    it('returns a new draft with a generated id when no attachment id is given', () => {
      const { rules } = createAttachmentsClient(attachments);

      expect(rules.getDraft()).toEqual({
        attachmentId: 'generated-attachment-id',
        isNew: true,
        origin: undefined,
        data: {},
      });
      expect(attachments.getAttachmentRecord).not.toHaveBeenCalled();
    });

    it('keeps the requested id but treats the draft as new when the attachment is missing', () => {
      attachments.getAttachmentRecord.mockReturnValue(undefined);

      expect(createAttachmentsClient(attachments).rules.getDraft('missing-id')).toEqual({
        attachmentId: 'missing-id',
        isNew: true,
        origin: undefined,
        data: {},
      });
    });

    it('returns the latest data and origin of an existing attachment', () => {
      attachments.getAttachmentRecord.mockReturnValue({
        id: 'existing-id',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        origin: 'policy-so-id',
        versions: [{ data: { name: 'Old' } }, { data: { name: 'Latest' } }],
      } as never);

      expect(createAttachmentsClient(attachments).actionPolicies.getDraft('existing-id')).toEqual({
        attachmentId: 'existing-id',
        isNew: false,
        origin: 'policy-so-id',
        data: { name: 'Latest' },
      });
    });

    it('throws when the attachment is of another type', () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('wf-att', WORKFLOW_YAML_ATTACHMENT_TYPE, { yaml: '' })
      );

      expect(() => createAttachmentsClient(attachments).rules.getDraft('wf-att')).toThrow(
        `Attachment "wf-att" is of type "${WORKFLOW_YAML_ATTACHMENT_TYPE}", expected "${RULE_ATTACHMENT_TYPE}".`
      );
    });
  });

  describe('saveDraft', () => {
    it('adds a new attachment with a label-based description', async () => {
      const { rules } = createAttachmentsClient(attachments);
      const data = { metadata: { name: 'CPU high' } };

      const result = await rules.saveDraft(rules.getDraft(), data);

      expect(attachments.add).toHaveBeenCalledWith({
        id: 'generated-attachment-id',
        type: RULE_ATTACHMENT_TYPE,
        description: 'Rule: CPU high',
        data,
      });
      expect(attachments.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'added', current_version: 1 });
    });

    it('updates an existing attachment', async () => {
      attachments.getAttachmentRecord.mockReturnValue(
        record('policy-att', ACTION_POLICY_ATTACHMENT_TYPE, { name: 'Existing' })
      );
      const { actionPolicies } = createAttachmentsClient(attachments);
      const data = { name: 'Renamed' };

      await actionPolicies.saveDraft(actionPolicies.getDraft('policy-att'), data);

      expect(attachments.update).toHaveBeenCalledWith('policy-att', {
        data,
        description: 'Action Policy: Renamed',
      });
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('falls back to the attachment id when the name is missing', async () => {
      const { workflows } = createAttachmentsClient(attachments);

      await workflows.saveDraft(workflows.getDraft(), { yaml: '' });

      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          description: 'Workflow: generated-attachment-id',
        })
      );
    });

    it('omits the description when no label is configured', async () => {
      const dashboards = createAttachmentsClient(attachments).ofType('dashboard');

      await dashboards.saveDraft(dashboards.getDraft(), {});

      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'dashboard', description: undefined })
      );
    });

    it('throws when the attachment could not be persisted', async () => {
      attachments.getAttachmentRecord.mockReturnValue(record('rule-att', RULE_ATTACHMENT_TYPE, {}));
      attachments.update.mockResolvedValue(undefined);
      const { rules } = createAttachmentsClient(attachments);

      await expect(rules.saveDraft(rules.getDraft('rule-att'), {})).rejects.toThrow(
        'Failed to persist rule attachment "rule-att".'
      );
    });
  });
});
