/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { CasesPermissions } from '../../../../common';
import type { ActionLicense } from '../../../../common/ui/types';
import * as i18n from '../../../common/translations';
import * as listI18n from '../translations';

interface GetListMenuArgs {
  permissions: CasesPermissions;
  isTemplatesEnabled: boolean;
  actionLicense: ActionLicense | null;
  navigateToCreateCase: () => void;
  navigateToConfigureCases: () => void;
  navigateToCasesTemplates: () => void;
  getCasesTemplatesUrl: () => string;
}

const getActionLicenseTooltip = (actionLicense: ActionLicense | null): string | undefined => {
  if (actionLicense != null && !actionLicense.enabledInLicense) {
    return listI18n.ACTION_LICENSE_REQUIRED;
  }
  if (actionLicense != null && !actionLicense.enabledInConfig) {
    return listI18n.ACTION_LICENSE_DISABLED_BY_CONFIG;
  }
  return undefined;
};

export const getListMenu = ({
  permissions,
  isTemplatesEnabled,
  actionLicense,
  navigateToCreateCase,
  navigateToConfigureCases,
  navigateToCasesTemplates,
  getCasesTemplatesUrl,
}: GetListMenuArgs): AppHeaderMenu => {
  const licenseTooltip = getActionLicenseTooltip(actionLicense);

  const items = [
    ...(isTemplatesEnabled && permissions.manageTemplates
      ? [
          {
            id: 'casesTemplates',
            label: i18n.TEMPLATES_BUTTON,
            iconType: 'documents' as const,
            href: getCasesTemplatesUrl(),
            run: () => navigateToCasesTemplates(),
            testId: 'cases-templates-button',
            order: 50,
          },
        ]
      : []),
    ...(permissions.settings
      ? [
          {
            id: 'configureCases',
            label: i18n.CONFIGURE_CASES_BUTTON,
            iconType: 'gear' as const,
            run: () => navigateToConfigureCases(),
            testId: 'configure-case-button',
            order: 100,
            ...(licenseTooltip ? { tooltipContent: licenseTooltip } : {}),
          },
        ]
      : []),
  ];

  return {
    items,
    ...(permissions.create
      ? {
          primaryActionItem: {
            id: 'createCase',
            label: i18n.CREATE_CASE_TITLE,
            iconType: 'plus' as const,
            run: () => navigateToCreateCase(),
            testId: 'createNewCaseBtn',
          },
        }
      : {}),
  };
};
