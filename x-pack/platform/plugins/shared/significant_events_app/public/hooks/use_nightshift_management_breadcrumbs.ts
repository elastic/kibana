/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import {
  NIGHTSHIFT_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
  SIGNIFICANT_EVENTS_APP_ID,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';
import { useKibana } from './use_kibana';

/** Sets Observability > Nightshift > Management breadcrumbs for classic and project chrome. */
export function useNightshiftManagementBreadcrumbs(): void {
  const {
    core: {
      application: { getUrlForApp, navigateToUrl },
      chrome,
    },
    dependencies: {
      start: { serverless },
    },
  } = useKibana();

  useEffect(() => {
    const nightshiftHref = getUrlForApp(NIGHTSHIFT_APP_ID);
    const observabilityHref = `${getUrlForApp(OBSERVABILITY_OVERVIEW_APP_ID)}/overview`;

    const extraCrumbs: ChromeBreadcrumb[] = [
      {
        href: nightshiftHref,
        text: i18n.translate('xpack.significantEventsApp.breadcrumbs.nightshift', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: NIGHTSHIFT_APP_ID,
        onClick: (event) => {
          event.preventDefault();
          void navigateToUrl(nightshiftHref);
        },
      },
      {
        text: i18n.translate('xpack.significantEventsApp.breadcrumbs.management', {
          defaultMessage: 'Management',
        }),
        deepLinkId: SIGNIFICANT_EVENTS_APP_ID,
      },
    ];

    const classicCrumbs: ChromeBreadcrumb[] = [
      {
        href: observabilityHref,
        text: i18n.translate('xpack.significantEventsApp.breadcrumbs.observability', {
          defaultMessage: 'Observability',
        }),
        onClick: (event) => {
          event.preventDefault();
          void navigateToUrl(observabilityHref);
        },
      },
      ...extraCrumbs,
    ];

    chrome.setBreadcrumbs(classicCrumbs, {
      project: { value: extraCrumbs, absolute: false },
    });
    chrome.docTitle.change(['Management', 'Nightshift', 'Observability']);
    serverless?.setBreadcrumbs(extraCrumbs, { absolute: false });
  }, [chrome, getUrlForApp, navigateToUrl, serverless]);
}
