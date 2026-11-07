/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

/**
 * The context engine is turned on per space by an advanced setting; read it the way the context
 * engine's own steps do, so publishing and the context engine never disagree.
 */
export const createIsContextEngineEnabled =
  (getCoreStart: () => Promise<CoreStart>) =>
  async (spaceId: string): Promise<boolean> => {
    const core = await getCoreStart();
    const soClient = core.savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId);
    try {
      return (
        (await core.uiSettings
          .asScopedToClient(soClient)
          .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)) ?? false
      );
    } catch {
      // The setting is registered by another plugin; when it isn't, the context engine is off.
      return false;
    }
  };
