/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { useCanManageSecrets } from './use_can_manage_secrets';
import { PLUGIN_ID } from '../../../../common';
import { useKibana } from '../../../hooks/use_kibana';

/** The app menu item that opens the secrets page, or undefined when the user cannot manage secrets. */
export const useSecretsMenuItem = (): AppMenuItemType | undefined => {
  const { application } = useKibana().services;
  const canManageSecrets = useCanManageSecrets();

  return useMemo(
    () =>
      canManageSecrets
        ? {
            id: 'secrets',
            order: 3,
            label: i18n.translate('workflows.secretsMenuItem', {
              defaultMessage: 'Secrets',
            }),
            iconType: 'lock',
            overflow: true,
            run: () => application.navigateToApp(PLUGIN_ID, { path: '/secrets' }),
            testId: 'workflowSecretsMenuItem',
          }
        : undefined,
    [application, canManageSecrets]
  );
};
