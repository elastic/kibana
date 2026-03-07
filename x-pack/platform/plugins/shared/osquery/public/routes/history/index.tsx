/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useRouteMatch } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { HistoryPage } from './list';
import { LiveQueryDetailsPage } from '../live_queries/details';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useKibana } from '../../common/lib/kibana';
import { MissingPrivileges } from '../components';

const HistoryComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  useBreadcrumbs('history');
  const match = useRouteMatch();

  if (!permissions.readLiveQueries) {
    return <MissingPrivileges />;
  }

  return (
    <Routes>
      <Route path={`${match.url}/new`}>
        <Redirect to="/new" />
      </Route>
      <Route path={`${match.url}/:actionId`}>
        <LiveQueryDetailsPage />
      </Route>
      <Route path={`${match.url}`}>
        <HistoryPage />
      </Route>
    </Routes>
  );
};

export const History = React.memo(HistoryComponent);
