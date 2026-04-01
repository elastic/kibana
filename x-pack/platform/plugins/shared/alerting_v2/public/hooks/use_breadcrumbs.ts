/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { MouseEvent } from 'react';
import { useEffect } from 'react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { ALERTING_V2_MANAGEMENT_PATH, MANAGEMENT_APP_ID } from '../constants';
import { getAlertingV2Breadcrumb, type AlertingV2BreadcrumbPage } from '../lib/breadcrumb';

export interface UseBreadcrumbsOptions {
  ruleName?: string;
}

const addClickHandlers = (
  breadcrumbs: ChromeBreadcrumb[],
  navigateToUrl: (url: string) => Promise<void>
): ChromeBreadcrumb[] =>
  breadcrumbs.map((bc) => ({
    ...bc,
    ...(bc.href
      ? {
          onClick: (ev: MouseEvent) => {
            if (ev.metaKey || ev.altKey || ev.ctrlKey || ev.shiftKey) {
              return;
            }
            ev.preventDefault();
            navigateToUrl(bc.href!);
          },
        }
      : {}),
  }));

export function useBreadcrumbs(
  page: AlertingV2BreadcrumbPage,
  options: UseBreadcrumbsOptions = {}
) {
  const chrome = useService(CoreStart('chrome'));
  const application = useService(CoreStart('application'));

  useEffect(() => {
    const listBreadcrumb: ChromeBreadcrumb = {
      ...getAlertingV2Breadcrumb('rules_list'),
      href: application.getUrlForApp(MANAGEMENT_APP_ID, {
        path: ALERTING_V2_MANAGEMENT_PATH,
      }),
    };

    let breadcrumbs: ChromeBreadcrumb[];

    switch (page) {
      case 'rules_list':
        breadcrumbs = [{ ...getAlertingV2Breadcrumb('rules_list') }];
        break;
      case 'create':
        breadcrumbs = [listBreadcrumb, getAlertingV2Breadcrumb('create')];
        break;
      case 'edit':
        breadcrumbs = [listBreadcrumb, getAlertingV2Breadcrumb('edit')];
        break;
      case 'rule_details':
        breadcrumbs = [
          listBreadcrumb,
          getAlertingV2Breadcrumb('rule_details', {
            ruleName: options.ruleName ?? '',
          }),
        ];
        break;
      default:
        breadcrumbs = [{ ...getAlertingV2Breadcrumb('rules_list') }];
    }

    const withClick = addClickHandlers(breadcrumbs, (url) => application.navigateToUrl(url));
    chrome.setBreadcrumbs(withClick);

    const docTitle = [...withClick].reverse().map((b) => (b.text as string) ?? '');
    chrome.docTitle.change(docTitle);
  }, [page, options.ruleName, chrome, application]);
}
