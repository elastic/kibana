/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { overviewDashboardId, setAgentBuilderDashboard } from './install_dashboard';
import {
  AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
  AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER,
} from './constants';

// ---------------------------------------------------------------------------
// overviewDashboardId
// ---------------------------------------------------------------------------

describe('overviewDashboardId', () => {
  it('returns a stable id composed of the base constant and the space id', () => {
    expect(overviewDashboardId('default')).toBe(`${AGENT_BUILDER_OVERVIEW_DASHBOARD_ID}-default`);
    expect(overviewDashboardId('my-space')).toBe(`${AGENT_BUILDER_OVERVIEW_DASHBOARD_ID}-my-space`);
  });
});

// ---------------------------------------------------------------------------
// setAgentBuilderDashboard
// ---------------------------------------------------------------------------

describe('setAgentBuilderDashboard', () => {
  const logger = loggerMock.create();

  function buildImporterMock() {
    return {
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 1,
        errors: [],
        warnings: [],
        successResults: [],
      }),
      resolveImportErrors: jest.fn(),
    };
  }

  function buildCoreStart() {
    const soClient = savedObjectsClientMock.create();
    soClient.delete.mockResolvedValue({} as any);

    const importerMock = buildImporterMock();

    const coreStart = {
      savedObjects: {
        createInternalRepository: jest.fn(() => soClient as any),
        createImporter: jest.fn(() => importerMock),
      },
    };

    return { coreStart, soClient, importerMock };
  }

  it('installs the dashboard when enabled is true', async () => {
    const { coreStart, importerMock } = buildCoreStart();

    await setAgentBuilderDashboard(coreStart as any, true, 'default', logger);

    expect(importerMock.import).toHaveBeenCalledWith(
      expect.objectContaining({
        overwrite: true,
        managed: true,
        createNewCopies: false,
      })
    );
  });

  it('removes the dashboard when enabled is false', async () => {
    const { coreStart, soClient, importerMock } = buildCoreStart();

    await setAgentBuilderDashboard(coreStart as any, false, 'default', logger);

    expect(soClient.delete).toHaveBeenCalledWith(
      'dashboard',
      expect.stringContaining('default'),
      expect.any(Object)
    );
    expect(importerMock.import).not.toHaveBeenCalled();
  });

  it('replaces the namespace placeholder with the per-space wildcard pattern in imported objects', async () => {
    const { coreStart, importerMock } = buildCoreStart();

    await setAgentBuilderDashboard(coreStart as any, true, 'my-space', logger);

    const importCall = importerMock.import.mock.calls[0][0];
    const objects: unknown[] = [];
    for await (const chunk of importCall.readStream) {
      objects.push(chunk);
    }

    const stringified = JSON.stringify(objects);
    expect(stringified).not.toContain(AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER);
    // Queries must cover every per-agent stream in the space ("my-space.*"), not a bare
    // space-scoped index ("my-space"). Assert the wildcard form is present and that the bare
    // form never appears immediately followed by anything other than the `.` wildcard segment
    // (robust to reformatting/whitespace, unlike matching a specific trailing character).
    expect(stringified).toContain('FROM traces-agent_builder.otel-my-space.*');
    expect(stringified).not.toMatch(/traces-agent_builder\.otel-my-space(?![.\w*-])/);
  });

  it('sets the dashboard id to the space-scoped id in the imported object', async () => {
    const { coreStart, importerMock } = buildCoreStart();

    await setAgentBuilderDashboard(coreStart as any, true, 'default', logger);

    const importCall = importerMock.import.mock.calls[0][0];
    const objects: unknown[] = [];
    for await (const chunk of importCall.readStream) {
      objects.push(chunk);
    }

    const dashboard = (objects as Array<{ type: string; id: string }>).find(
      (o) => o.type === 'dashboard'
    );
    expect(dashboard?.id).toBe(overviewDashboardId('default'));
  });
});
