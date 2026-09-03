/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';

import { BASE_PATH } from '../../../common/constants';
import type { Page } from '../page_paths';
import { pagePathGetters } from '../page_paths';

import { useKibana } from '../lib/kibana';

const BASE_BREADCRUMB: ChromeBreadcrumb = {
  href: pagePathGetters.overview(),
  text: i18n.translate('xpack.osquery.breadcrumbs.appTitle', {
    defaultMessage: 'Osquery',
  }),
};

/**
 * Values interpolated into breadcrumb text. Unlike `DynamicPagePathValues` -- which
 * feeds URL builders and is therefore string-only -- these are rendered, not
 * serialized into a path, so flags stay booleans and can't silently mistype.
 */
export interface BreadcrumbValues {
  [key: string]: string | number | boolean | undefined;
}

const breadcrumbGetters: {
  [key in Page]?: (values: BreadcrumbValues) => ChromeBreadcrumb[];
} = {
  base: () => [BASE_BREADCRUMB],
  overview: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.overviewPageTitle', {
        defaultMessage: 'Overview',
      }),
    },
  ],
  history: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.history(),
      text: i18n.translate('xpack.osquery.breadcrumbs.historyPageTitle', {
        defaultMessage: 'History',
      }),
    },
  ],
  new_query: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.history(),
      text: i18n.translate('xpack.osquery.breadcrumbs.historyPageTitle', {
        defaultMessage: 'History',
      }),
    },
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.newQueryPageTitle', {
        defaultMessage: 'New',
      }),
    },
  ],
  history_details: ({ liveQueryId }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.history(),
      text: i18n.translate('xpack.osquery.breadcrumbs.historyPageTitle', {
        defaultMessage: 'History',
      }),
    },
    {
      text: liveQueryId,
    },
  ],
  history_scheduled_details: ({ scheduleId, executionCount }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.history(),
      text: i18n.translate('xpack.osquery.breadcrumbs.historyPageTitle', {
        defaultMessage: 'History',
      }),
    },
    {
      text: scheduleId,
    },
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.scheduledExecutionTitle', {
        defaultMessage: 'Execution #{executionCount}',
        values: { executionCount },
      }),
    },
  ],
  saved_queries: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.savedQueriesPageTitle', {
        defaultMessage: 'Saved queries',
      }),
    },
  ],
  saved_query_new: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.saved_queries(),
      text: i18n.translate('xpack.osquery.breadcrumbs.savedQueriesPageTitle', {
        defaultMessage: 'Saved queries',
      }),
    },
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.newSavedQueryPageTitle', {
        defaultMessage: 'New',
      }),
    },
  ],
  saved_query_edit: ({ savedQueryName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.saved_queries(),
      text: i18n.translate('xpack.osquery.breadcrumbs.savedQueriesPageTitle', {
        defaultMessage: 'Saved queries',
      }),
    },
    {
      text: savedQueryName,
    },
  ],
  packs: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.packsPageTitle', {
        defaultMessage: 'Packs',
      }),
    },
  ],
  pack_add: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.packs(),
      text: i18n.translate('xpack.osquery.breadcrumbs.packsPageTitle', {
        defaultMessage: 'Packs',
      }),
    },
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.addpacksPageTitle', {
        defaultMessage: 'Add',
      }),
    },
  ],
  pack_edit: ({ packName, isReadOnly }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.packs(),
      text: i18n.translate('xpack.osquery.breadcrumbs.packsPageTitle', {
        defaultMessage: 'Packs',
      }),
    },
    {
      text: packName,
    },
    {
      // A readPacks-only user lands on a read-only pack page, so the trailing crumb
      // must not say "Edit" (matches the kebab affordance in pack_row_actions).
      text: isReadOnly
        ? i18n.translate('xpack.osquery.breadcrumbs.viewpacksPageTitle', {
            defaultMessage: 'View',
          })
        : i18n.translate('xpack.osquery.breadcrumbs.editpacksPageTitle', {
            defaultMessage: 'Edit',
          }),
    },
  ],
};

export function useBreadcrumbs(page: Page, values: BreadcrumbValues = {}) {
  const { chrome, http, application } = useKibana().services;

  const breadcrumbs: ChromeBreadcrumb[] =
    breadcrumbGetters[page]?.(values).map((breadcrumb) => {
      const href = breadcrumb.href
        ? http.basePath.prepend(`${BASE_PATH}${breadcrumb.href}`)
        : undefined;

      return {
        ...breadcrumb,
        href,
        onClick: href
          ? (ev: React.MouseEvent) => {
              if (ev.metaKey || ev.altKey || ev.ctrlKey || ev.shiftKey) {
                return;
              }

              ev.preventDefault();
              application.navigateToUrl(href);
            }
          : undefined,
      };
    }) || [];
  const docTitle: string[] = [...breadcrumbs]
    .reverse()
    .map((breadcrumb) => breadcrumb.text as string);
  chrome.docTitle.change(docTitle);
  chrome.setBreadcrumbs(breadcrumbs);
}
