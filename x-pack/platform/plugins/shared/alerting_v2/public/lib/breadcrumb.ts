/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type AlertingV2BreadcrumbPage = 'rules_list' | 'create' | 'edit' | 'rule_details';

export const getAlertingV2Breadcrumb = (
  page: AlertingV2BreadcrumbPage,
  options?: { ruleName?: string }
): { text: string } => {
  switch (page) {
    case 'rules_list':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.rulesListTitle', {
          defaultMessage: 'Alerting V2',
        }),
      };
    case 'create':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.createTitle', {
          defaultMessage: 'Create',
        }),
      };
    case 'edit':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.editTitle', {
          defaultMessage: 'Edit',
        }),
      };
    case 'rule_details':
      return {
        text: options?.ruleName ?? '',
      };
    default:
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.rulesListTitle', {
          defaultMessage: 'Alerting V2',
        }),
      };
  }
};
