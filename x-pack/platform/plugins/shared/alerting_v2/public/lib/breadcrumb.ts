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
  | 'action_policies_list'
  | 'action_policy_create'
  | 'action_policy_edit'
  | 'episodes_list'
  | 'episode_details';

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
    case 'action_policies_list':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.actionPoliciesListTitle', {
          defaultMessage: 'Action Policies',
        }),
      };
    case 'action_policy_create':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.actionPolicyCreateTitle', {
          defaultMessage: 'Create',
        }),
      };
    case 'action_policy_edit':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.actionPolicyEditTitle', {
          defaultMessage: 'Edit',
        }),
      };
    case 'episodes_list':
      return {
        text: i18n.translate('xpack.alertingV2.breadcrumbs.episodesListTitle', {
          defaultMessage: 'Alert episodes',
        }),
      };
    case 'episode_details':
      return {
        text: options?.ruleName ?? '',
      };
  }
};
