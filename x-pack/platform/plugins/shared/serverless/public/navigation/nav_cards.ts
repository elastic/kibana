/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { appCategories, CardNavExtensionDefinition } from '@kbn/management-cards-navigation';

export const manageOrgMembersNavCardName = 'organization_members';

export function generateManageOrgMembersNavCard(cloudOrgUrl?: string): CardNavExtensionDefinition {
  return {
    category: appCategories.ACCESS,
    description: i18n.translate('xpack.serverless.nav.manageOrgMembersDescription', {
      defaultMessage: 'Invite team members and assign them roles to access this project.',
    }),
    icon: 'users',
    skipValidation: true,
    href: cloudOrgUrl ?? '',
    title: i18n.translate('xpack.serverless.nav.manageOrgMembersTitle', {
      defaultMessage: 'Manage organization members',
    }),
  };
}
