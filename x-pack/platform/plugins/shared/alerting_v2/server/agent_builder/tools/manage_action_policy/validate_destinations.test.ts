/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { ActionPolicyOperationValidationError } from './operations';
import { validateDestinations } from './validate_destinations';

const createMockAttachments = (
  active: Array<{
    id: string;
    type: string;
    versions: Array<{ data: Record<string, unknown> }>;
  }> = []
): AttachmentStateManager =>
  ({
    getActive: jest.fn().mockReturnValue(active),
  } as unknown as AttachmentStateManager);

const createMockWorkflowLookup = (
  workflows: Map<string, { id: string; name?: string }> = new Map()
) => ({
  getWorkflow: jest.fn(async (id: string) => workflows.get(id) ?? null),
});

const createMockConnectorLookup = (
  connectors: Map<string, { id: string; name: string }> = new Map()
) => ({
  findConnectorById: jest.fn(async (id: string) => connectors.get(id) ?? null),
});

describe('validateDestinations', () => {
  it('rejects bare attachment IDs and instructs to use workflowId', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-workflow-1',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [{ data: { yaml: 'version: 1', workflowId: 'wf-saved-1' } }],
      },
    ]);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'att-workflow-1' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'att-workflow-1' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(/is a workflow attachment ID, not a workflow ID/);
  });

  it('passes when destination matches an in-memory workflow attachment by workflowId', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-workflow-1',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [{ data: { yaml: 'version: 1', workflowId: 'wf-saved-1' } }],
      },
    ]);

    const result = await validateDestinations([{ type: 'workflow', id: 'wf-saved-1' }], {
      attachments,
      workflowLookup: createMockWorkflowLookup(),
      connectorLookup: createMockConnectorLookup(),
      spaceId: 'default',
    });

    expect(result).toBeInstanceOf(Map);
  });

  it('passes when destination matches a persisted workflow', async () => {
    const workflowLookup = createMockWorkflowLookup(
      new Map([['persisted-wf-1', { id: 'persisted-wf-1' }]])
    );

    const result = await validateDestinations([{ type: 'workflow', id: 'persisted-wf-1' }], {
      attachments: createMockAttachments(),
      workflowLookup,
      connectorLookup: createMockConnectorLookup(),
      spaceId: 'default',
    });

    expect(result).toBeInstanceOf(Map);
    expect(workflowLookup.getWorkflow).toHaveBeenCalledWith('persisted-wf-1', 'default');
  });

  it('throws a specific error when the destination ID is a connector', async () => {
    const connectorLookup = createMockConnectorLookup(
      new Map([['conn-email-1', { id: 'conn-email-1', name: 'SRE On-Call Alerts' }]])
    );

    await expect(
      validateDestinations([{ type: 'workflow', id: 'conn-email-1' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup,
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'conn-email-1' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup,
        spaceId: 'default',
      })
    ).rejects.toThrow(/is a connector \("SRE On-Call Alerts"\), not a workflow/);
  });

  it('throws a generic error when the destination ID is unknown', async () => {
    await expect(
      validateDestinations([{ type: 'workflow', id: 'unknown-id-123' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(ActionPolicyOperationValidationError);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'unknown-id-123' }], {
        attachments: createMockAttachments(),
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(/is not a valid workflow in this space or conversation/);
  });

  it('skips persisted and connector lookups when workflowId matches', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-wf',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [
          { data: { yaml: 'version: 1', workflowId: 'notify-high-cpu', name: 'High CPU' } },
        ],
      },
    ]);
    const workflowLookup = createMockWorkflowLookup();
    const connectorLookup = createMockConnectorLookup();

    await validateDestinations([{ type: 'workflow', id: 'notify-high-cpu' }], {
      attachments,
      workflowLookup,
      connectorLookup,
      spaceId: 'default',
    });

    expect(workflowLookup.getWorkflow).not.toHaveBeenCalled();
    expect(connectorLookup.findConnectorById).not.toHaveBeenCalled();
  });

  it('skips connector lookup when persisted workflow matches', async () => {
    const workflowLookup = createMockWorkflowLookup(new Map([['wf-1', { id: 'wf-1' }]]));
    const connectorLookup = createMockConnectorLookup();

    await validateDestinations([{ type: 'workflow', id: 'wf-1' }], {
      attachments: createMockAttachments(),
      workflowLookup,
      connectorLookup,
      spaceId: 'default',
    });

    expect(connectorLookup.findConnectorById).not.toHaveBeenCalled();
  });

  it('validates multiple destinations and fails on the first invalid one', async () => {
    const attachments = createMockAttachments([
      {
        id: 'att-wf-ok',
        type: WORKFLOW_YAML_ATTACHMENT_TYPE,
        versions: [{ data: { yaml: 'version: 1', workflowId: 'notify-ok', name: 'OK' } }],
      },
    ]);

    await expect(
      validateDestinations(
        [
          { type: 'workflow', id: 'notify-ok' },
          { type: 'workflow', id: 'bad-id' },
        ],
        {
          attachments,
          workflowLookup: createMockWorkflowLookup(),
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        }
      )
    ).rejects.toThrow(/bad-id/);
  });

  it('ignores non-workflow attachments when scanning for matches', async () => {
    const attachments = createMockAttachments([
      {
        id: 'some-connector-att',
        type: 'connector',
        versions: [{ data: { connectorId: 'some-id' } }],
      },
    ]);

    await expect(
      validateDestinations([{ type: 'workflow', id: 'some-connector-att' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      })
    ).rejects.toThrow(/is not a valid workflow/);
  });

  describe('resolved destination metadata', () => {
    it('marks in-memory workflowId destinations as drafts', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf-1',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [
            {
              data: { yaml: 'version: 1', workflowId: 'notify-high-cpu', name: 'Notify: High CPU' },
            },
          ],
        },
      ]);

      const result = await validateDestinations([{ type: 'workflow', id: 'notify-high-cpu' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.get('notify-high-cpu')).toEqual({ name: 'Notify: High CPU', isDraft: true });
    });

    it('marks in-memory attachment destinations by workflowId as drafts', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf-1',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [
            { data: { yaml: 'version: 1', workflowId: 'wf-persisted', name: 'Alert Email' } },
          ],
        },
      ]);

      const result = await validateDestinations([{ type: 'workflow', id: 'wf-persisted' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.get('wf-persisted')).toEqual({ name: 'Alert Email', isDraft: true });
    });

    it('marks persisted workflow destinations as not drafts', async () => {
      const workflowLookup = createMockWorkflowLookup(
        new Map([['persisted-wf', { id: 'persisted-wf', name: 'SRE Notifications' }]])
      );

      const result = await validateDestinations([{ type: 'workflow', id: 'persisted-wf' }], {
        attachments: createMockAttachments(),
        workflowLookup,
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.get('persisted-wf')).toEqual({ name: 'SRE Notifications', isDraft: false });
    });

    it('falls back to workflowId as name when no name is available', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf-1',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [{ data: { yaml: 'version: 1', workflowId: 'notify-unnamed' } }],
        },
      ]);

      const result = await validateDestinations([{ type: 'workflow', id: 'notify-unnamed' }], {
        attachments,
        workflowLookup: createMockWorkflowLookup(),
        connectorLookup: createMockConnectorLookup(),
        spaceId: 'default',
      });

      expect(result.get('notify-unnamed')).toEqual({ name: 'notify-unnamed', isDraft: true });
    });

    it('resolves mixed draft and persisted destinations', async () => {
      const attachments = createMockAttachments([
        {
          id: 'att-wf-1',
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          versions: [
            { data: { yaml: 'v: 1', workflowId: 'notify-draft', name: 'Draft Workflow' } },
          ],
        },
      ]);
      const workflowLookup = createMockWorkflowLookup(
        new Map([['persisted-wf', { id: 'persisted-wf', name: 'Saved Workflow' }]])
      );

      const result = await validateDestinations(
        [
          { type: 'workflow', id: 'notify-draft' },
          { type: 'workflow', id: 'persisted-wf' },
        ],
        {
          attachments,
          workflowLookup,
          connectorLookup: createMockConnectorLookup(),
          spaceId: 'default',
        }
      );

      expect(result.get('notify-draft')).toEqual({ name: 'Draft Workflow', isDraft: true });
      expect(result.get('persisted-wf')).toEqual({ name: 'Saved Workflow', isDraft: false });
    });
  });
});
