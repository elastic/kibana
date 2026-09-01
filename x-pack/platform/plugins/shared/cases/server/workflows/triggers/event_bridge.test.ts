/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  createWorkflowsClientMock,
  workflowsExtensionsMock,
} from '@kbn/workflows-extensions/server/mocks';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
  CaseStatusUpdatedTriggerId,
  ExtendedFieldsUpdatedTriggerId,
  ObservablesAddedTriggerId,
} from '../../../common/workflows/triggers';
import { CasesEventBus } from '../../events/event_bus';
import { registerCasesWorkflowEventBridge } from './event_bridge';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

describe('registerCasesWorkflowEventBridge', () => {
  const workflowsExtensions = workflowsExtensionsMock.createStart();
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  let mockClient = createWorkflowsClientMock();
  let eventBus = new CasesEventBus();

  beforeEach(() => {
    eventBus = new CasesEventBus();
    mockClient = createWorkflowsClientMock();
    workflowsExtensions.getClient.mockResolvedValue(mockClient);
    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);
  });

  it('forwards cases events to workflows extensions', async () => {
    eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' });
    eventBus.emitCaseUpdated(
      request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['title'],
      },
      { previousCase: undefined, updatedCase: undefined }
    );
    eventBus.emitAttachmentsAdded(request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'alert',
      owner: 'securitySolution',
    });

    await flushMicrotasks();

    expect(workflowsExtensions.getClient).toHaveBeenCalledTimes(3);
    expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
    expect(mockClient.emitEvent).toHaveBeenCalledTimes(3);
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, CaseCreatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, CaseUpdatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
      updatedFields: ['title'],
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(3, AttachmentsAddedTriggerId, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'alert',
      owner: 'securitySolution',
    });
  });

  it('forwards a status trigger event if necessary', async () => {
    eventBus.emitCaseUpdated(
      request,
      {
        caseId: 'case-1',
        owner: 'securitySolution',
        updatedFields: ['status'],
      },
      {
        // @ts-expect-error - we just care about the status
        previousCase: { attributes: { status: 'in-progress' } },
        // @ts-expect-error - we just care about the status
        updatedCase: { status: 'closed' },
      }
    );

    await flushMicrotasks();

    expect(mockClient.emitEvent).toHaveBeenCalledTimes(2);
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, CaseUpdatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
      updatedFields: ['status'],
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, CaseStatusUpdatedTriggerId, {
      caseId: 'case-1',
      owner: 'securitySolution',
      previousStatus: 'in-progress',
      status: 'closed',
    });
  });

  it('changes the legacy `user` attachment type to `comment`', async () => {
    eventBus.emitAttachmentsAdded(request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'user',
      owner: 'securitySolution',
    });

    await flushMicrotasks();

    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, AttachmentsAddedTriggerId, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });
  });

  it('emits comment added triggers when comment attachments were emitted', async () => {
    eventBus.emitAttachmentsAdded(request, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });

    await flushMicrotasks();

    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, AttachmentsAddedTriggerId, {
      caseId: 'case-1',
      attachmentIds: ['attachment-1'],
      attachmentType: 'comment',
      owner: 'securitySolution',
    });
    expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, CommentsAddedTriggerId, {
      caseId: 'case-1',
      commentIds: ['attachment-1'],
      owner: 'securitySolution',
    });
  });

  it('logs warning when forwarding fails', async () => {
    mockClient = createWorkflowsClientMock({
      emitEvent: jest.fn().mockRejectedValue(new Error('boom')),
    });
    workflowsExtensions.getClient.mockResolvedValue(mockClient);
    registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);
    eventBus.emitCaseCreated(request, { caseId: 'case-1', owner: 'securitySolution' });

    await flushMicrotasks();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to emit workflow trigger "${CaseCreatedTriggerId}"`)
    );
  });

  describe('extendedFieldsUpdated trigger', () => {
    const basePayload = { caseId: 'case-1', owner: 'securitySolution' as const };

    it('fires when extended_fields change directly', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'low' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      // caseUpdated + extendedFieldsUpdated
      expect(mockClient.emitEvent).toHaveBeenCalledTimes(2);
      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(1, CaseUpdatedTriggerId, {
        ...basePayload,
        updatedFields: ['extended_fields'],
      });
      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, ExtendedFieldsUpdatedTriggerId, {
        ...basePayload,
        changedFields: ['priority'],
      });
    });

    it('fires when customFields mirror drives extended_fields change (updatedFields omits extended_fields)', async () => {
      /*
       * FAILURE SCENARIO: a `updatedFields.includes('extended_fields')` gate would miss this.
       * The adapter runs AFTER updatedFields is computed, so the patch only records 'customFields'.
       */
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['customFields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'low' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledTimes(2);
      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, ExtendedFieldsUpdatedTriggerId, {
        ...basePayload,
        changedFields: ['priority'],
      });
    });

    it('does not fire on a no-op update (distinct objects, identical extended_fields)', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['title'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'high' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      // Only caseUpdated should have been emitted
      expect(mockClient.emitEvent).toHaveBeenCalledTimes(1);
      expect(mockClient.emitEvent).toHaveBeenCalledWith(CaseUpdatedTriggerId, expect.anything());
    });

    it('does not fire when only non-extended fields change', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['title'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'high' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).not.toHaveBeenCalledWith(
        ExtendedFieldsUpdatedTriggerId,
        expect.anything()
      );
    });

    it('fires on absent → empty-string; previousExtendedFields is empty (newly added)', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: {} } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: '' } },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, ExtendedFieldsUpdatedTriggerId, {
        ...basePayload,
        changedFields: ['priority'],
      });
    });

    it('fires on empty-string → value; previousExtendedFields has empty-string (not treated as absent)', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: '' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, ExtendedFieldsUpdatedTriggerId, {
        ...basePayload,
        changedFields: ['priority'],
      });
    });

    it('fires on value → absent (linked-field clear)', async () => {
      /*
       * FAILURE SCENARIO: buildExtendedFieldsUserActions structurally cannot see removals
       * (one-sided loop). This test verifies the trigger catches it.
       */
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'high' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: {} },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, ExtendedFieldsUpdatedTriggerId, {
        ...basePayload,
        changedFields: ['priority'],
      });
    });

    it('fires on empty-string → absent', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: '' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: {} },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(2, ExtendedFieldsUpdatedTriggerId, {
        ...basePayload,
        changedFields: ['priority'],
      });
    });

    it('does not fire when both sides are null/undefined', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: [] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: null } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: undefined },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).not.toHaveBeenCalledWith(
        ExtendedFieldsUpdatedTriggerId,
        expect.anything()
      );
    });

    it('does not include unchanged sibling keys in changedFields', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          previousCase: {
            attributes: { extended_fields: { priority: 'low', severity: 'medium' } },
          } as never,
          updatedCase: { extended_fields: { priority: 'high', severity: 'medium' } } as never,
        }
      );

      await flushMicrotasks();

      const [, payload] = jest.mocked(mockClient.emitEvent).mock.calls[1];
      expect((payload as { changedFields: string[] }).changedFields).toEqual(['priority']);
    });

    it('reports changedFields alphabetically sorted for multiple changes', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          previousCase: {
            attributes: { extended_fields: { charlie: '1', alpha: '2', beta: '3' } },
          } as never,
          updatedCase: { extended_fields: { charlie: 'x', alpha: 'y', beta: 'z' } } as never,
        }
      );

      await flushMicrotasks();

      const [, payload] = jest.mocked(mockClient.emitEvent).mock.calls[1];
      expect((payload as { changedFields: string[] }).changedFields).toEqual([
        'alpha',
        'beta',
        'charlie',
      ]);
    });

    it('does not expose field values in the payload (only changed keys)', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'low' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      const [, payload] = jest.mocked(mockClient.emitEvent).mock.calls[1];
      expect(payload).not.toHaveProperty('extendedFields');
      expect(payload).not.toHaveProperty('previousExtendedFields');
      expect(payload).not.toHaveProperty('truncatedFields');
    });

    it('emits caseUpdated, caseStatusUpdated, extendedFieldsUpdated in order when both status and extended_fields change', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['status', 'extended_fields'] },
        {
          previousCase: {
            attributes: { status: 'open', extended_fields: { priority: 'low' } },
          } as never,
          updatedCase: { status: 'closed', extended_fields: { priority: 'high' } } as never,
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledTimes(3);
      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(
        1,
        CaseUpdatedTriggerId,
        expect.anything()
      );
      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(
        2,
        CaseStatusUpdatedTriggerId,
        expect.anything()
      );
      expect(mockClient.emitEvent).toHaveBeenNthCalledWith(
        3,
        ExtendedFieldsUpdatedTriggerId,
        expect.anything()
      );
    });

    it('does not fire when previousCase is missing', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          previousCase: undefined,
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).not.toHaveBeenCalledWith(
        ExtendedFieldsUpdatedTriggerId,
        expect.anything()
      );
    });

    it('does not fire when updatedCase is missing', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'low' } } },
          updatedCase: undefined,
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).not.toHaveBeenCalledWith(
        ExtendedFieldsUpdatedTriggerId,
        expect.anything()
      );
    });

    it('fires for a legacy non-string SO value — coerced via String()', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing — legacy numeric SO value
          previousCase: { attributes: { extended_fields: { count: 5 } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { count: '6' } },
        }
      );

      await flushMicrotasks();

      const [, payload] = jest.mocked(mockClient.emitEvent).mock.calls[1];
      const p = payload as { changedFields: string[] };
      expect(p.changedFields).toEqual(['count']);
    });

    it('does not fire for a non-string SO value equal after coercion', async () => {
      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { count: 5 } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { count: '5' } },
        }
      );

      await flushMicrotasks();

      expect(mockClient.emitEvent).not.toHaveBeenCalledWith(
        ExtendedFieldsUpdatedTriggerId,
        expect.anything()
      );
    });

    it('logs a warning when emitEvent rejects for extendedFieldsUpdated', async () => {
      mockClient = createWorkflowsClientMock({
        emitEvent: jest.fn().mockRejectedValue(new Error('trigger-boom')),
      });
      workflowsExtensions.getClient.mockResolvedValue(mockClient);
      registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);

      eventBus.emitCaseUpdated(
        request,
        { ...basePayload, updatedFields: ['extended_fields'] },
        {
          // @ts-expect-error - partial case objects for testing
          previousCase: { attributes: { extended_fields: { priority: 'low' } } },
          // @ts-expect-error - partial case objects for testing
          updatedCase: { extended_fields: { priority: 'high' } },
        }
      );

      await flushMicrotasks();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to emit workflow trigger "${ExtendedFieldsUpdatedTriggerId}"`
        )
      );
    });
  });

  describe('observablesAdded trigger', () => {
    const observablesPayload = {
      caseId: 'case-1',
      owner: 'securitySolution' as const,
      observableIds: ['obs-1'],
      observableTypeKeys: ['observable-type-ipv4'],
    };

    it('forwards observablesAdded events to workflows extensions', async () => {
      eventBus.emitObservablesAdded(request, observablesPayload);

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledWith(
        ObservablesAddedTriggerId,
        observablesPayload
      );
    });

    it('forwards multiple observable ids and type keys', async () => {
      const multiPayload = {
        ...observablesPayload,
        observableIds: ['obs-1', 'obs-2'],
        observableTypeKeys: ['observable-type-file-hash', 'observable-type-ipv4'],
      };

      eventBus.emitObservablesAdded(request, multiPayload);

      await flushMicrotasks();

      expect(mockClient.emitEvent).toHaveBeenCalledWith(ObservablesAddedTriggerId, multiPayload);
    });

    it('does not include value or description in the forwarded payload', async () => {
      eventBus.emitObservablesAdded(request, observablesPayload);

      await flushMicrotasks();

      const [, payload] = jest.mocked(mockClient.emitEvent).mock.calls[0];
      expect(payload).not.toHaveProperty('value');
      expect(payload).not.toHaveProperty('description');
      expect(payload).not.toHaveProperty('observables');
    });

    it('logs a warning when forwarding fails', async () => {
      mockClient = createWorkflowsClientMock({
        emitEvent: jest.fn().mockRejectedValue(new Error('workflows error')),
      });
      workflowsExtensions.getClient.mockResolvedValue(mockClient);
      registerCasesWorkflowEventBridge(eventBus, workflowsExtensions, logger);

      eventBus.emitObservablesAdded(request, observablesPayload);

      await flushMicrotasks();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to emit workflow trigger "${ObservablesAddedTriggerId}"`)
      );
    });
  });
});
