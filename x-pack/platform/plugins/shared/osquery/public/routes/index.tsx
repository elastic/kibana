/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { useBreadcrumbs } from '../common/hooks/use_breadcrumbs';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import { useKibana } from '../common/lib/kibana';
import { LiveQueries } from './live_queries';
import { History } from './history';
import { SavedQueries } from './saved_queries';
import { Packs } from './packs';
import { NewLiveQueryPage } from './live_queries/new';
import { MissingPrivileges } from './components';

const LiveQueriesToHistoryRedirect = () => {
  const location = useLocation();
  const newPath =
    location.pathname === '/live_queries/new'
      ? '/new' + location.search
      : location.pathname.replace('/live_queries', '/history') + location.search;

  return <Redirect to={newPath} />;
};

const NewQueryRoute = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const canRunQuery =
    permissions.writeLiveQueries ||
    (permissions.runSavedQueries && (permissions.readSavedQueries || permissions.readPacks));

  return canRunQuery ? <NewLiveQueryPage /> : <MissingPrivileges />;
};

const OsqueryAppRoutesComponent = () => {
  useBreadcrumbs('base');
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');

  return (
    <Routes>
      <Route path={`/packs`}>
        <Packs />
      </Route>
      <Route path={`/saved_queries`}>
        <SavedQueries />
      </Route>
      {isHistoryEnabled ? (
        <>
          <Route path="/new">
            <NewQueryRoute />
          </Route>
          <Route path="/history">
            <History />
          </Route>
          <Route path="/live_queries">
            <LiveQueriesToHistoryRedirect />
          </Route>
          <Redirect to="/history" />
        </>
      ) : (
        <>
          <Route path="/live_queries">
            <LiveQueries />
          </Route>
          <Redirect to="/live_queries" />
        </>
      )}
    </Routes>
  );
};

export const OsqueryAppRoutes = React.memo(OsqueryAppRoutesComponent);
