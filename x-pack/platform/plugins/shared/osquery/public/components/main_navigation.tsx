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
  type AppHeaderBack,
  type AppHeaderMenu,
  type AppHeaderTab,
} from '@kbn/app-header';
import { useRouterNavigate, useKibana } from '../common/lib/kibana';
import { PAGE_ROUTING_PATHS } from '../common/page_paths';
import { useOsqueryPageHeaderTitle } from './osquery_page_header_context';
import { useAddIntegrationsMenuItem } from '../common/hooks/use_add_integrations_menu_item';
import { useHistoryBack } from '../common/hooks/use_history_back';
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
  const { application, docLinks } = useKibana().services;
  const permissions = application.capabilities.osquery;
  const location = useLocation();
  const subpageTitle = useOsqueryPageHeaderTitle();

  const isResultsRoute = useMemo(
    () =>
      [PAGE_ROUTING_PATHS.history_details, PAGE_ROUTING_PATHS.history_scheduled_details].some(
        (path) => matchExact(location.pathname, path)
      ),
    [location.pathname]
  );

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

  const addIntegrationsMenuItem = useAddIntegrationsMenuItem();

  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    const items = addIntegrationsMenuItem ? [addIntegrationsMenuItem] : [];

    // Subpages (Run query, pack and saved query create/edit) have no actions of their own.
    if (!isListView) {
      return items.length ? { items } : undefined;
    }

    return {
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
      items,
    };
  }, [addIntegrationsMenuItem, canRunQuery, history, isListView, newQueryNavProps.href]);
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

  const historyBack = useHistoryBack();

  const subpageHeader = useMemo(() => {
    const { pathname } = location;
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
        title: i18n.translate('xpack.osquery.createPack.pageTitle', {
          defaultMessage: 'Create pack',
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

    // Results routes normally render their own header (see below); this fallback only shows
    // alongside `MissingPrivileges` when the user can't read live queries.
    if (isResultsRoute) {
      return {
        title: i18n.translate('xpack.osquery.liveQueryActionResults.results', {
          defaultMessage: 'Query results',
        }),
        back: historyBack,
      };
    }

    return null;
  }, [
    historyBack,
    isResultsRoute,
    location,
    packsBackLabel,
    packsNavProps.href,
    queriesBackLabel,
    savedQueriesNavProps.href,
    subpageTitle,
  ]);

  // `history_details` and `history_scheduled_details` render their own page-level `AppHeader`
  // (they own the result data/actions); rendering one here too would double the header.
  if (isResultsRoute && permissions.readLiveQueries) {
    return null;
  }

  if (!isListView && !subpageHeader) {
    return null;
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
      docLink={docLinks.links.osquery.guide}
    />
  );
};
