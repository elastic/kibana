/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useEffect } from 'react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { getAlertingV2Breadcrumb, type AlertingV2BreadcrumbPage } from '../lib/breadcrumb';
import { useSetBreadcrumbs } from '../application/breadcrumb_context';

export interface UseBreadcrumbsOptions {
  ruleName?: string;
}

export function useBreadcrumbs(
  page: AlertingV2BreadcrumbPage,
  options: UseBreadcrumbsOptions = {}
) {
  const setBreadcrumbs = useSetBreadcrumbs();
  const chrome = useService(CoreStart('chrome'));

  useEffect(() => {
    const rootBreadcrumb: ChromeBreadcrumb = {
      ...getAlertingV2Breadcrumb('root'),
    };

    const rulesListBreadcrumb: ChromeBreadcrumb = {
      ...getAlertingV2Breadcrumb('rules_list'),
      href: '/',
    };

    const actionPoliciesListBreadcrumb: ChromeBreadcrumb = {
      ...getAlertingV2Breadcrumb('action_policies_list'),
      href: '/',
    };

    const episodesListBreadcrumb: ChromeBreadcrumb = {
      ...getAlertingV2Breadcrumb('episodes_list'),
      href: '/',
    };

    let breadcrumbs: ChromeBreadcrumb[];

    switch (page) {
      case 'rules_list':
        breadcrumbs = [rootBreadcrumb, { ...getAlertingV2Breadcrumb('rules_list') }];
        break;
      case 'create':
        breadcrumbs = [rootBreadcrumb, rulesListBreadcrumb, getAlertingV2Breadcrumb('create')];
        break;
      case 'edit':
        breadcrumbs = [rootBreadcrumb, rulesListBreadcrumb, getAlertingV2Breadcrumb('edit')];
        break;
      case 'rule_details':
        breadcrumbs = [
          rootBreadcrumb,
          rulesListBreadcrumb,
          getAlertingV2Breadcrumb('rule_details', {
            ruleName: options.ruleName ?? '',
          }),
        ];
        break;
      case 'action_policies_list':
        breadcrumbs = [rootBreadcrumb, { ...getAlertingV2Breadcrumb('action_policies_list') }];
        break;
      case 'action_policy_create':
        breadcrumbs = [
          rootBreadcrumb,
          actionPoliciesListBreadcrumb,
          getAlertingV2Breadcrumb('action_policy_create'),
        ];
        break;
      case 'action_policy_edit':
        breadcrumbs = [
          rootBreadcrumb,
          actionPoliciesListBreadcrumb,
          getAlertingV2Breadcrumb('action_policy_edit'),
        ];
        break;
      case 'episodes_list':
        breadcrumbs = [rootBreadcrumb, { ...getAlertingV2Breadcrumb('episodes_list') }];
        break;
      case 'episode_details':
        breadcrumbs = [
          rootBreadcrumb,
          episodesListBreadcrumb,
          getAlertingV2Breadcrumb('episode_details', {
            ruleName: options.ruleName ?? '',
          }),
        ];
        break;
      case 'rule_doctor':
        breadcrumbs = [rootBreadcrumb, { ...getAlertingV2Breadcrumb('rule_doctor') }];
        break;
      default:
        breadcrumbs = [rootBreadcrumb, { ...getAlertingV2Breadcrumb('rules_list') }];
    }

    setBreadcrumbs(breadcrumbs);

    const docTitle = [...breadcrumbs].reverse().map((b) => (b.text as string) ?? '');
    chrome.docTitle.change(docTitle);
  }, [page, options.ruleName, setBreadcrumbs, chrome]);
}
