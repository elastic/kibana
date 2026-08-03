/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { TaskManagerPluginsStart, TaskManagerStartContract } from '../../plugin';
import { INVALIDATE_API_KEY_SO_NAME, TASK_SO_NAME } from '../../saved_objects';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import { createProvisioningRunContext } from './create_provisioning_run_context';

const createCore = (uiamConvert: jest.Mock | undefined) => {
  const coreStart = coreMock.createStart();
  (coreStart as unknown as { security: unknown }).security = {
    authc: { apiKeys: { uiam: uiamConvert ? { convert: uiamConvert } : undefined } },
  };
  const core = {
    getStartServices: jest.fn().mockResolvedValue([coreStart, {}, {} as TaskManagerStartContract]),
  } as unknown as CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>;
  return { core, coreStart };
};

describe('createProvisioningRunContext', () => {
  it('writes encrypted attributes through an encryption-aware client and uses a plain repository for the status SO', async () => {
    const { core, coreStart } = createCore(jest.fn());

    const context = await createProvisioningRunContext(core);

    // `task` (uiamApiKey) and `api_key_to_invalidate` (uiamApiKey) are ESO types, so the
    // client used to write them MUST carry the encryption extension. Regression guard for
    // the bug where the plain `createInternalRepository` was used and stored the secret
    // unencrypted, breaking later decryption.
    expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: [TASK_SO_NAME, INVALIDATE_API_KEY_SO_NAME],
    });
    expect(context.unsafeSavedObjectsClient).toBe(
      (coreStart.savedObjects.getUnsafeInternalClient as jest.Mock).mock.results[0].value
    );

    // The provisioning status SO has no encrypted attributes, so the plain repository is fine.
    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith([
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    ]);
    expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalledWith(
      expect.arrayContaining([TASK_SO_NAME])
    );
    expect(context.savedObjectsClient).toBe(
      (coreStart.savedObjects.createInternalRepository as jest.Mock).mock.results[0].value
    );
  });

  it('throws when the UIAM convert API is not available', async () => {
    const { core } = createCore(undefined);

    await expect(createProvisioningRunContext(core)).rejects.toThrow(
      'UIAM convert API is not available'
    );
  });
});
