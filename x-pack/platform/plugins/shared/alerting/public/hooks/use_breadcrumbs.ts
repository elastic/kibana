/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { MouseEvent } from 'react';
import { useEffect } from 'react';
import type { MaintenanceWindowDeepLinkIds } from '@kbn/maintenance-windows-plugin/common';
import { MANAGEMENT_APP_ID } from '@kbn/maintenance-windows-plugin/common';
import { useKibana } from '../utils/kibana_react';
import { useNavigation } from './use_navigation';

function addClickHandlers(
  breadcrumbs: ChromeBreadcrumb[],
  navigateToHref?: (url: string) => Promise<void>
) {
  return breadcrumbs.map((bc) => ({
    ...bc,
    ...(bc.href
      ? {
          onClick: (event: MouseEvent) => {
            if (navigateToHref && bc.href) {
              event.preventDefault();
              navigateToHref(bc.href);
            }
          },
        }
      : {}),
  }));
}

function getTitleFromBreadCrumbs(breadcrumbs: ChromeBreadcrumb[]) {
  return breadcrumbs.map(({ text }) => text?.toString() ?? '').reverse();
}

export const useBreadcrumbs = (pageDeepLink: MaintenanceWindowDeepLinkIds) => {
  const {
    services: {
      chrome: { docTitle, setBreadcrumbs },
      application: { navigateToUrl },
      serverless,
    },
  } = useKibana();

  const setTitle = docTitle.change;
  const { getAppUrl } = useNavigation(MANAGEMENT_APP_ID);

  useEffect(() => {
    const breadcrumbs = [
      ...(!serverless
        ? [
            {
              text: i18n.translate('xpack.alerting.breadcrumbs.stackManagementLinkText', {
                defaultMessage: 'Stack Management',
              }),
              href: getAppUrl(),
            },
          ]
        : []),
    ];

    if (serverless?.setBreadcrumbs) {
      serverless.setBreadcrumbs(breadcrumbs);
    } else {
      setBreadcrumbs(addClickHandlers(breadcrumbs, navigateToUrl));
    }

    if (setTitle) {
      setTitle(getTitleFromBreadCrumbs(breadcrumbs));
    }
  }, [pageDeepLink, getAppUrl, navigateToUrl, setBreadcrumbs, setTitle, serverless]);
};
