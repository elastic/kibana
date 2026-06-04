/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { ContextSwitcherSpacesConfig } from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

type Actions = Pick<ContextSwitcherSpacesConfig, 'headerAction' | 'footerAction'>;

export const useManagementActions = ({
  application,
  canManageSpaces,
}: {
  application: CoreStart['application'];
  canManageSpaces?: boolean;
}): Partial<Actions> => {
  return useMemo(
    () =>
      canManageSpaces
        ? {
            headerAction: {
              id: 'manageSpaces',
              label: i18n.translate('xpack.spaces.contextSwitcher.manage', {
                defaultMessage: 'Manage',
              }),
              onClick: () => application.navigateToApp('management', { path: 'kibana/spaces' }),
            },
            footerAction: {
              id: 'createSpace',
              label: i18n.translate('xpack.spaces.contextSwitcher.createSpace', {
                defaultMessage: 'Create space',
              }),
              onClick: () =>
                application.navigateToApp('management', { path: 'kibana/spaces/create' }),
            },
          }
        : {},
    [application, canManageSpaces]
  );
};
