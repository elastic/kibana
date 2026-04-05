/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type AlertingV2BreadcrumbPage =
  | 'root'
  | 'rules_list'
  | 'create'
  | 'edit'
  | 'rule_details'
  | 'notification_policies_list'
  | 'notification_policy_create'
  | 'notification_policy_edit';

export const getAlertingV2Breadcrumb = (
  page: AlertingV2BreadcrumbPage,
  options?: { ruleName?: string }
): { text: string } => {
  switch (page) {
    case 'root':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.rootTitle', {
          defaultMessage: 'Alerting V2',
        }),
      };
    case 'rules_list':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.rulesListTitle', {
          defaultMessage: 'Rules',
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
    case 'notification_policies_list':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.notificationPoliciesListTitle', {
          defaultMessage: 'Notification Policies',
        }),
      };
    case 'notification_policy_create':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.notificationPolicyCreateTitle', {
          defaultMessage: 'Create',
        }),
      };
    case 'notification_policy_edit':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.notificationPolicyEditTitle', {
          defaultMessage: 'Edit',
        }),
      };
  }
};
