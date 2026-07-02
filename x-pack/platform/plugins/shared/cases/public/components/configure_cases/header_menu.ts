/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { CasesPermissions } from '../../../common';
import * as i18n from './translations';

interface GetSettingsMenuArgs {
  isTemplatesEnabled: boolean;
  permissions: CasesPermissions;
  navigateToCasesTemplates: () => void;
  getCasesTemplatesUrl: () => string;
}

export const getSettingsMenu = ({
  isTemplatesEnabled,
  permissions,
  navigateToCasesTemplates,
  getCasesTemplatesUrl,
}: GetSettingsMenuArgs): AppHeaderMenu | undefined => {
  if (!isTemplatesEnabled || !permissions.manageTemplates) {
    return undefined;
  }

  return {
    items: [
      {
        id: 'templates',
        label: i18n.SETTINGS_TAB_TEMPLATES,
        iconType: 'documents',
        href: getCasesTemplatesUrl(),
        run: () => navigateToCasesTemplates(),
        testId: 'configure-cases-templates-button',
        order: 100,
      },
    ],
  };
};
