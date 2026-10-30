/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/app-menu';
import { useKibana } from '../lib/kibana';

const ADD_INTEGRATIONS_LABEL = i18n.translate(
  'xpack.osquery.appHeader.addIntegrationsMenuItemLabel',
  { defaultMessage: 'Add integrations' }
);

export const ADD_INTEGRATIONS_MENU_ITEM_TEST_ID = 'osqueryAddIntegrationsMenuItem';

/**
 * "Add integrations" as a regular overflow item rather than the `AppHeader` built-in, so it groups
 * with the page's own actions above the divider that separates Feedback and Documentation (the
 * Chrome Next migration guide layout, same as Security's `SecurityAppHeader`).
 */
export const useAddIntegrationsMenuItem = (): AppMenuItemType | undefined => {
  const { application } = useKibana().services;
  const canAccessIntegrations = application.capabilities.navLinks?.integrations === true;

  return useMemo<AppMenuItemType | undefined>(() => {
    if (!canAccessIntegrations) {
      return undefined;
    }

    return {
      id: 'addIntegrations',
      label: ADD_INTEGRATIONS_LABEL,
      iconType: 'indexOpen',
      href: application.getUrlForApp('integrations', { path: '/browse' }),
      overflow: true,
      // Last among the page's items, right above the Feedback / Documentation divider.
      order: 100,
      testId: ADD_INTEGRATIONS_MENU_ITEM_TEST_ID,
    };
  }, [application, canAccessIntegrations]);
};

/** App menu for Osquery headers that have no actions of their own. */
export const useAddIntegrationsOnlyMenu = (): AppMenuConfig | undefined => {
  const addIntegrationsMenuItem = useAddIntegrationsMenuItem();

  return useMemo<AppMenuConfig | undefined>(
    () => (addIntegrationsMenuItem ? { items: [addIntegrationsMenuItem] } : undefined),
    [addIntegrationsMenuItem]
  );
};
