/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installWorkflows } from './install_workflows';

type ClientMock = jest.Mocked<Pick<PluginScopedManagedWorkflowsApi, 'install'>>;

const createClientMock = (): ClientMock => ({
  install: jest.fn().mockResolvedValue(undefined),
});

const SIGEVENT_WORKFLOW_IDS = [
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
];

const MEMORY_WORKFLOW_IDS = [
  STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
];

const installedIds = (client: ClientMock) =>
  client.install.mock.calls.map(([id]) => id);

describe('installWorkflows', () => {
  describe('sigevent workflows', () => {
    it('installs all four sigevent workflows when the memory flag is off', async () => {
      const client = createClientMock();
      await installWorkflows({ client: client as unknown as PluginScopedManagedWorkflowsApi, isSignificantEventsMemoryEnabled: false });

      for (const id of SIGEVENT_WORKFLOW_IDS) {
        expect(installedIds(client)).toContain(id);
      }
    });

    it('installs all four sigevent workflows when the memory flag is on', async () => {
      const client = createClientMock();
      await installWorkflows({ client: client as unknown as PluginScopedManagedWorkflowsApi, isSignificantEventsMemoryEnabled: true });

      for (const id of SIGEVENT_WORKFLOW_IDS) {
        expect(installedIds(client)).toContain(id);
      }
    });
  });

  describe('memory workflows — feature flag off', () => {
    it('does not install memory workflows', async () => {
      const client = createClientMock();
      await installWorkflows({ client: client as unknown as PluginScopedManagedWorkflowsApi, isSignificantEventsMemoryEnabled: false });

      for (const id of MEMORY_WORKFLOW_IDS) {
        expect(installedIds(client)).not.toContain(id);
      }
    });
  });

  describe('memory workflows — feature flag on', () => {
    it('installs all three memory workflows', async () => {
      const client = createClientMock();
      await installWorkflows({ client: client as unknown as PluginScopedManagedWorkflowsApi, isSignificantEventsMemoryEnabled: true });

      for (const id of MEMORY_WORKFLOW_IDS) {
        expect(installedIds(client)).toContain(id);
      }
    });
  });
});
