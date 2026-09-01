/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installWorkflows } from './install_workflows';

jest.mock('../../../memory_and_investigation/lib/memory/install_managed_workflows', () => ({
  installMemoryWorkflows: jest.fn().mockResolvedValue(undefined),
}));

describe('installWorkflows', () => {
  it('installs KI sync in the default space but leaves cleanup for per-space bootstrap', async () => {
    const install = jest.fn().mockResolvedValue(undefined);
    const client = { install } as unknown as PluginScopedManagedWorkflowsApi;

    await installWorkflows({ client });

    expect(install).toHaveBeenCalledWith(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, {
      spaceId: DEFAULT_SPACE_ID,
    });
    expect(install).not.toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
      expect.anything()
    );
  });
});
