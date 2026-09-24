/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { matchPath, useHistory, useLocation } from 'react-router-dom';
import {
  AppHeader,
  AppHeaderLoading,
  AppHeaderView,
  type AppHeaderBack,
  type AppHeaderTab,
} from '@kbn/app-header';
import { useRouterNavigate, useKibana } from '../common/lib/kibana';
import { PAGE_ROUTING_PATHS } from '../common/page_paths';
import { useOsqueryAppMenu } from './use_osquery_app_menu';
import { useOsqueryPageHeaderTitle } from './osquery_page_header_context';
import { getHistoryFilters } from '../actions/history_filter_storage';

enum Section {
  History = 'history',
  Packs = 'packs',
  SavedQueries = 'saved_queries',
}

const matchExact = <Params extends { [K in keyof Params]?: string }>(
  pathname: string,
  path: string
) => matchPath<Params>(pathname, { path, exact: true });

export const MainNavigation = () => {
  const history = useHistory();
  const permissions = useKibana().services.application.capabilities.osquery;
  const location = useLocation();
  const subpageTitle = useOsqueryPageHeaderTitle();
  const section = useMemo(() => {
    const firstSegment = location.pathname.split('/')[1] ?? 'overview';

    return firstSegment === 'new' ? Section.History : firstSegment;
  }, [location.pathname]);

  const isListView = useMemo(
    () =>
      [PAGE_ROUTING_PATHS.history, PAGE_ROUTING_PATHS.packs, PAGE_ROUTING_PATHS.saved_queries].some(
        (path) => matchExact(location.pathname, path)
      ),
    [location.pathname]
  );
  const osqueryTitle = i18n.translate('xpack.osquery.appNavigation.title', {
    defaultMessage: 'Osquery',
  });
  const historyBackLabel = i18n.translate('xpack.osquery.appNavigation.historyLinkText', {
    defaultMessage: 'History',
  });
  const packsBackLabel = i18n.translate('xpack.osquery.appNavigation.packsLinkText', {
    defaultMessage: 'Packs',
  });
  const queriesBackLabel = i18n.translate('xpack.osquery.appNavigation.queriesLinkText', {
    defaultMessage: 'Queries',
  });

  const persistedHistoryQs = getHistoryFilters();
  const historyPath = persistedHistoryQs
    ? `${Section.History}${persistedHistoryQs}`
    : Section.History;
  const historyNavProps = useRouterNavigate(historyPath);
  const packsNavProps = useRouterNavigate(Section.Packs);
  const savedQueriesNavProps = useRouterNavigate(Section.SavedQueries);
  const newQueryNavProps = useRouterNavigate('/new');

  const canRunQuery =
    permissions.writeLiveQueries ||
    (permissions.runSavedQueries && (permissions.readSavedQueries || permissions.readPacks));

  const listMenuExtras = useMemo(
    () =>
      isListView
        ? {
            primaryActionItem: {
              id: 'runQuery',
              iconType: 'play' as const,
              label: i18n.translate('xpack.osquery.history.newLiveQueryButtonLabel', {
                defaultMessage: 'Run query',
              }),
              href: newQueryNavProps.href,
              testId: 'osqueryRunQueryButton',
              disableButton: !canRunQuery,
              run: () => {
                history.push('/new');
              },
            },
          }
        : undefined,
    [canRunQuery, history, isListView, newQueryNavProps.href]
  );
  const menu = useOsqueryAppMenu(listMenuExtras);
  const loadingMenu = useMemo(() => ({ buttonCount: 1, hasPrimary: false }), []);

  const tabs = useMemo<AppHeaderTab[]>(
    () => [
      {
        id: Section.History,
        label: historyBackLabel,
        isSelected: section === Section.History,
        href: historyNavProps.href,
      },
      {
        id: Section.Packs,
        label: packsBackLabel,
        isSelected: section === Section.Packs,
        href: packsNavProps.href,
      },
      {
        id: Section.SavedQueries,
        label: queriesBackLabel,
        isSelected: section === Section.SavedQueries,
        href: savedQueriesNavProps.href,
      },
    ],
    [
      historyBackLabel,
      historyNavProps.href,
      packsBackLabel,
      packsNavProps.href,
      queriesBackLabel,
      savedQueriesNavProps.href,
      section,
    ]
  );

  const subpageHeader = useMemo(() => {
    const { pathname } = location;
    const historyBack: AppHeaderBack = {
      href: historyNavProps.href,
      label: historyBackLabel,
    };
    const packsBack: AppHeaderBack = {
      href: packsNavProps.href,
      label: packsBackLabel,
    };
    const queriesBack: AppHeaderBack = {
      href: savedQueriesNavProps.href,
      label: queriesBackLabel,
    };

    if (matchExact(pathname, PAGE_ROUTING_PATHS.new_query)) {
      return {
        title: i18n.translate('xpack.osquery.newLiveQuery.pageTitle', {
          defaultMessage: 'Run query',
        }),
        back: historyBack,
      };
    }

    if (matchExact(pathname, PAGE_ROUTING_PATHS.saved_query_new)) {
      return {
        title: i18n.translate('xpack.osquery.addSavedQuery.pageTitle', {
          defaultMessage: 'Add saved query',
        }),
        back: queriesBack,
      };
    }

    const savedQueryEditMatch = matchExact<{ savedQueryId: string }>(
      pathname,
      PAGE_ROUTING_PATHS.saved_query_edit
    );
    if (savedQueryEditMatch) {
      return {
        title: subpageTitle,
        back: queriesBack,
      };
    }

    if (matchExact(pathname, PAGE_ROUTING_PATHS.pack_add)) {
      return {
        title: i18n.translate('xpack.osquery.addPack.pageTitle', {
          defaultMessage: 'Add pack',
        }),
        back: packsBack,
      };
    }

    if (matchExact(pathname, PAGE_ROUTING_PATHS.pack_edit)) {
      return {
        title: subpageTitle,
        back: packsBack,
      };
    }

    if (matchExact(pathname, PAGE_ROUTING_PATHS.history_scheduled_details)) {
      return {
        title: i18n.translate('xpack.osquery.liveQueryActionResults.results', {
          defaultMessage: 'Query results',
        }),
        back: historyBack,
      };
    }

    if (matchExact(pathname, PAGE_ROUTING_PATHS.history_details)) {
      return {
        title: i18n.translate('xpack.osquery.liveQueryActionResults.results', {
          defaultMessage: 'Query results',
        }),
        back: historyBack,
      };
    }

    return null;
  }, [
    historyBackLabel,
    historyNavProps.href,
    location,
    packsBackLabel,
    packsNavProps.href,
    queriesBackLabel,
    savedQueriesNavProps.href,
    subpageTitle,
  ]);

  if (!isListView && !subpageHeader) {
    if (!menu.items?.length) {
      return null;
    }

    return <AppHeaderView menu={menu} />;
  }

  if (subpageHeader && subpageHeader.title === undefined) {
    return <AppHeaderLoading back={subpageHeader.back} menu={loadingMenu} />;
  }

  return (
    <AppHeader
      title={subpageHeader?.title ?? osqueryTitle}
      back={subpageHeader?.back}
      tabs={subpageHeader ? undefined : tabs}
      menu={menu}
    />
  );
};
