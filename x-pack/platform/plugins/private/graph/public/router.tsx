/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createHashHistory } from 'history';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';

import { ListingRoute } from './apps/listing_route';
import { GraphServices } from './application';
import { WorkspaceRoute } from './apps/workspace_route';

export const graphRouter = (deps: GraphServices) => {
  const history = createHashHistory();

  return (
    <Router history={history}>
      <Routes>
        <Route exact path="/home">
          <ListingRoute deps={deps} />
        </Route>
        <Route path="/workspace/:id?">
          <WorkspaceRoute deps={deps} />
        </Route>
        <Route>
          <Redirect exact to="/home" />
        </Route>
      </Routes>
    </Router>
  );
};
