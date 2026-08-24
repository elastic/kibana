/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  FEEDBACK_LOOP_SCHEDULE_INTERVAL_MINUTES,
  IMPROVEMENTS_INTERNAL_API_VERSION,
} from '../../common/constants';
import type { WorkflowProvider } from '../workflows/provider';
import {
  FeedbackScheduleUnavailableError,
  buildFeedbackWorkflowSuffix,
  createFeedbackScheduleService,
} from './schedule';

const buildStatusReport = (overrides: Record<string, unknown> = {}) =>
  ({
    status: 'intact',
    workflowId: 'wf-1',
    installed: true,
    enabled: true,
    ...overrides,
  } as unknown as Awaited<ReturnType<PluginScopedManagedWorkflowsApi['getWorkflowStatus']>>);

describe('feedback schedule service', () => {
  const request = httpServerMock.createKibanaRequest();
  let managedWorkflows: jest.Mocked<
    Pick<PluginScopedManagedWorkflowsApi, 'install' | 'uninstall' | 'getWorkflowStatus' | 'execute'>
  >;
  let workflowProvider: jest.Mocked<Pick<WorkflowProvider, 'setEnabled'>>;
  let logger: ReturnType<typeof loggerMock.create>;

  const createService = ({
    withManagedWorkflows = true,
    withWorkflowProvider = true,
  }: { withManagedWorkflows?: boolean; withWorkflowProvider?: boolean } = {}) =>
    createFeedbackScheduleService({
      getManagedWorkflows: async () =>
        withManagedWorkflows
          ? (managedWorkflows as unknown as PluginScopedManagedWorkflowsApi)
          : undefined,
      getWorkflowProvider: () =>
        withWorkflowProvider ? (workflowProvider as unknown as WorkflowProvider) : undefined,
      logger,
    });

  beforeEach(() => {
    logger = loggerMock.create();
    managedWorkflows = {
      install: jest.fn(),
      uninstall: jest.fn(),
      getWorkflowStatus: jest.fn().mockResolvedValue(buildStatusReport()),
      execute: jest.fn().mockResolvedValue('exec-1'),
    };
    workflowProvider = { setEnabled: jest.fn() };
  });

  it('namespaces the workflow instance by space and AI index', () => {
    expect(buildFeedbackWorkflowSuffix('marketing', 'customer_support')).toBe(
      'marketing-customer_support'
    );
    expect(buildFeedbackWorkflowSuffix('default', 'customer_support')).not.toBe(
      buildFeedbackWorkflowSuffix('marketing', 'customer_support')
    );
  });

  describe('getStatus', () => {
    it('reports the workflow backing an installed schedule', async () => {
      managedWorkflows.getWorkflowStatus.mockResolvedValue(
        buildStatusReport({ workflowId: 'wf-7', enabled: true })
      );

      await expect(
        createService().getStatus({ spaceId: 'default', aiIndexId: 'customer_support' })
      ).resolves.toEqual({ enabled: true, workflow_id: 'wf-7' });

      expect(managedWorkflows.getWorkflowStatus).toHaveBeenCalledWith(
        CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID,
        { spaceId: 'default', workflowIdSuffix: 'default-customer_support' }
      );
    });

    it('reports a never-installed schedule as off, with no workflow', async () => {
      managedWorkflows.getWorkflowStatus.mockResolvedValue(
        buildStatusReport({ installed: false, enabled: null })
      );

      await expect(
        createService().getStatus({ spaceId: 'default', aiIndexId: 'customer_support' })
      ).resolves.toEqual({ enabled: false });
    });

    it('fails with an unavailable error when workflows is missing', async () => {
      await expect(
        createService({ withManagedWorkflows: false }).getStatus({
          spaceId: 'default',
          aiIndexId: 'customer_support',
        })
      ).rejects.toBeInstanceOf(FeedbackScheduleUnavailableError);
    });
  });

  describe('setEnabled', () => {
    it('installs the instance with the AI index and interval before enabling', async () => {
      await createService().setEnabled({
        spaceId: 'default',
        aiIndexId: 'customer_support',
        enabled: true,
        request,
      });

      expect(managedWorkflows.install).toHaveBeenCalledWith(
        CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID,
        {
          spaceId: 'default',
          workflowIdSuffix: 'default-customer_support',
          values: {
            aiIndexId: 'customer_support',
            intervalMinutes: FEEDBACK_LOOP_SCHEDULE_INTERVAL_MINUTES,
            apiVersion: IMPROVEMENTS_INTERNAL_API_VERSION,
          },
        }
      );
    });

    it('enables through the caller’s request, so scheduled runs inherit their privileges', async () => {
      await expect(
        createService().setEnabled({
          spaceId: 'default',
          aiIndexId: 'customer_support',
          enabled: true,
          request,
        })
      ).resolves.toEqual({ enabled: true, workflow_id: 'wf-1' });

      expect(workflowProvider.setEnabled).toHaveBeenCalledWith({
        spaceId: 'default',
        request,
        workflowId: 'wf-1',
        enabled: true,
      });
    });

    it('disables an installed schedule', async () => {
      await expect(
        createService().setEnabled({
          spaceId: 'default',
          aiIndexId: 'customer_support',
          enabled: false,
          request,
        })
      ).resolves.toEqual({ enabled: false, workflow_id: 'wf-1' });

      expect(workflowProvider.setEnabled).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: 'wf-1', enabled: false })
      );
    });

    it('does not install anything just to disable a schedule that was never on', async () => {
      managedWorkflows.getWorkflowStatus.mockResolvedValue(
        buildStatusReport({ installed: false, enabled: null })
      );

      await expect(
        createService().setEnabled({
          spaceId: 'default',
          aiIndexId: 'customer_support',
          enabled: false,
          request,
        })
      ).resolves.toEqual({ enabled: false });

      expect(managedWorkflows.install).not.toHaveBeenCalled();
      expect(workflowProvider.setEnabled).not.toHaveBeenCalled();
    });

    it('fails when the install did not land', async () => {
      managedWorkflows.getWorkflowStatus.mockResolvedValue(
        buildStatusReport({ installed: false, enabled: null })
      );

      await expect(
        createService().setEnabled({
          spaceId: 'default',
          aiIndexId: 'customer_support',
          enabled: true,
          request,
        })
      ).rejects.toBeInstanceOf(FeedbackScheduleUnavailableError);
      expect(workflowProvider.setEnabled).not.toHaveBeenCalled();
    });

    it('fails with an unavailable error when no workflow provider is registered', async () => {
      await expect(
        createService({ withWorkflowProvider: false }).setEnabled({
          spaceId: 'default',
          aiIndexId: 'customer_support',
          enabled: true,
          request,
        })
      ).rejects.toBeInstanceOf(FeedbackScheduleUnavailableError);
    });
  });

  describe('run', () => {
    it('installs the instance and executes it manually, returning the execution id', async () => {
      await expect(
        createService().run({ spaceId: 'default', aiIndexId: 'customer_support', request })
      ).resolves.toBe('exec-1');

      expect(managedWorkflows.install).toHaveBeenCalled();
      expect(managedWorkflows.execute).toHaveBeenCalledWith(
        request,
        CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID,
        {
          spaceId: 'default',
          workflowIdSuffix: 'default-customer_support',
          triggeredBy: 'manual',
        }
      );
    });

    it('runs without enabling the schedule', async () => {
      await createService().run({ spaceId: 'default', aiIndexId: 'customer_support', request });

      expect(workflowProvider.setEnabled).not.toHaveBeenCalled();
    });
  });

  describe('uninstall', () => {
    it('removes the instance for the space', async () => {
      await createService().uninstall({ spaceId: 'default', aiIndexId: 'customer_support' });

      expect(managedWorkflows.uninstall).toHaveBeenCalledWith(
        CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID,
        { spaceId: 'default', workflowIdSuffix: 'default-customer_support' }
      );
    });

    it('logs and swallows failures, since the AI index is already gone', async () => {
      managedWorkflows.uninstall.mockRejectedValue(new Error('workflow index closed'));

      await expect(
        createService().uninstall({ spaceId: 'default', aiIndexId: 'customer_support' })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('workflow index closed'));
    });

    it('is a no-op when workflows is unavailable', async () => {
      await expect(
        createService({ withManagedWorkflows: false }).uninstall({
          spaceId: 'default',
          aiIndexId: 'customer_support',
        })
      ).resolves.toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
