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
import { useKibana } from '../common/lib/kibana';
import { History } from './history';
import { SavedQueries } from './saved_queries';
import { Packs } from './packs';
import { NewLiveQueryPage } from './live_queries/new';
import { MissingPrivileges, NotFoundPage } from './components';

const LIVE_QUERIES_PATH = '/live_queries';

// Keeps pre-9.4 `/live_queries` bookmarks working: maps `/live_queries/new` to the
// top-level `/new` page and any other subpath (e.g. `/live_queries/<actionId>`) onto
// its `/history` equivalent, preserving the query string and hash.
const LiveQueriesToHistoryRedirect = () => {
  const location = useLocation();
  const suffix = location.search + location.hash;
  // The gating route matches case-insensitively and tolerates trailing slashes, so derive the
  // remainder positionally rather than by string search to keep those variants on a real target.
  const pathname = location.pathname.replace(/\/+$/, '');
  const remainder = pathname.slice(LIVE_QUERIES_PATH.length);
  const newPath =
    remainder.toLowerCase() === '/new' ? '/new' + suffix : '/history' + remainder + suffix;

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

  return (
    <Routes>
      <Route path={`/packs`}>
        <Packs />
      </Route>
      <Route path={`/saved_queries`}>
        <SavedQueries />
      </Route>
      <Route path="/new">
        <NewQueryRoute />
      </Route>
      <Route path="/history">
        <History />
      </Route>
      <Route path="/live_queries">
        <LiveQueriesToHistoryRedirect />
      </Route>
      <Route exact path="/">
        <Redirect to="/history" />
      </Route>
      <Route>
        <NotFoundPage />
      </Route>
    </Routes>
  );
};

export const OsqueryAppRoutes = React.memo(OsqueryAppRoutesComponent);
