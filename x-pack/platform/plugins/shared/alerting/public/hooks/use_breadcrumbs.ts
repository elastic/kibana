/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { MouseEvent, useEffect } from 'react';
import { useKibana } from '../utils/kibana_react';
import { useNavigation } from './use_navigation';
import {
  MANAGEMENT_APP_ID,
  MaintenanceWindowDeepLinkIds,
  MAINTENANCE_WINDOW_DEEP_LINK_IDS,
} from '../../common';

const breadcrumbTitle: Record<MaintenanceWindowDeepLinkIds, string> = {
  [MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows]: i18n.translate(
    'xpack.alerting.breadcrumbs.maintenanceWindowsLinkText',
    {
      defaultMessage: 'Maintenance Windows',
    }
  ),
  [MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsCreate]: i18n.translate(
    'xpack.alerting.breadcrumbs.createMaintenanceWindowsLinkText',
    {
      defaultMessage: 'Create',
    }
  ),
  [MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsEdit]: i18n.translate(
    'xpack.alerting.breadcrumbs.editMaintenanceWindowsLinkText',
    {
      defaultMessage: 'Edit',
    }
  ),
};

const topLevelBreadcrumb: Record<string, MaintenanceWindowDeepLinkIds> = {
  [MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsCreate]:
    MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows,
  [MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsEdit]:
    MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows,
};

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
      ...(topLevelBreadcrumb[pageDeepLink]
        ? [
            {
              text: breadcrumbTitle[topLevelBreadcrumb[pageDeepLink]],
              href: getAppUrl({ deepLinkId: topLevelBreadcrumb[pageDeepLink] }),
            },
          ]
        : []),
      {
        text: breadcrumbTitle[pageDeepLink],
      },
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
