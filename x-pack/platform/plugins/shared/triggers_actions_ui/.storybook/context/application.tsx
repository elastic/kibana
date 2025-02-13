/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { of } from 'rxjs';
import type { ApplicationStart } from '@kbn/core/public';
import { getDefaultCapabilities } from './capabilities';

export const getDefaultServicesApplication = (
  override?: Partial<ApplicationStart>
): ApplicationStart => {
  const applications = new Map();

  return {
    currentLocation$: of(),
    currentAppId$: of('fleet'),
    navigateToUrl: async (url: string) => {
      action(`Navigate to: ${url}`);
    },
    navigateToApp: async (app: string) => {
      action(`Navigate to: ${app}`);
    },
    isAppRegistered: (appId: string) => true,
    getUrlForApp: (url: string) => url,
    capabilities: getDefaultCapabilities(),
    applications$: of(applications),
    ...override,
  };
};
