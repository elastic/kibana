/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { firstValueFrom } from 'rxjs';
import type { AiopsPluginStartDeps } from '../types';

export const setupCapabilities = (core: CoreSetup<AiopsPluginStartDeps>, enabled: boolean) => {
  core.capabilities.registerProvider(() => {
    return {
      aiops: {
        enabled,
      },
    };
  });

  core.capabilities.registerSwitcher(
    async (request, capabilities, useDefaultCapabilities) => {
      const [, { licensing }] = await core.getStartServices();
      const lic = await firstValueFrom(licensing.license$);
      if (lic.hasAtLeast('platinum') === false) {
        return {
          aiops: {
            enabled: false,
          },
        };
      }

      return {};
    },
    {
      capabilityPath: 'aiops.*',
    }
  );
};
