/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { MouseEvent, useEffect } from 'react';
import { MANAGEMENT_APP_ID } from '@kbn/management-plugin/public';
import { useKibana } from '../utils/kibana_react';
import { useNavigation } from './use_navigation';

const breadcrumbTitle: Record<string, string> = {
  taskManager: i18n.translate('xpack.taskManager.breadcrumbs.taskManagerLinkText', {
    defaultMessage: 'Task Manager',
  }),
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

export const useBreadcrumbs = (pageDeepLink: string) => {
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
              text: i18n.translate('xpack.taskManager.breadcrumbs.kibanaLinkText', {
                defaultMessage: 'Kibana',
              }),
              href: getAppUrl(),
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
