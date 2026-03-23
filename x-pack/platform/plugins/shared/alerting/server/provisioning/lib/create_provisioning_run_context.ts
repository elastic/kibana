/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import {
  RULE_SAVED_OBJECT_TYPE,
  UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
} from '../../saved_objects';
import type { ProvisioningRunContext } from '../types';
import type { AlertingPluginsStart } from '../../plugin';

export const createProvisioningRunContext = async (
  core: CoreSetup<AlertingPluginsStart>
): Promise<ProvisioningRunContext> => {
  const [coreStart, plugins] = await core.getStartServices();
  const uiamConvert = coreStart.security?.authc?.apiKeys?.uiam?.convert;
  if (typeof uiamConvert !== 'function') {
    throw new Error('UIAM convert API is not available');
  }
  const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
  });
  const unsafeSavedObjectsClient = coreStart.savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
  });
  const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
    UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    API_KEY_PENDING_INVALIDATION_TYPE,
  ]);
  return {
    coreStart,
    plugins,
    uiamConvert,
    encryptedSavedObjectsClient,
    unsafeSavedObjectsClient,
    savedObjectsClient,
  };
};
