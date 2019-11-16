/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { Detail, DetailProps } from './screens/detail';
import { Home } from './screens/home';
import { PLUGIN } from '../common/constants';

// patterns are used by React Router and are relative to `APP_ROOT`
export const patterns = {
  APP_ROOT: `/app/${PLUGIN.ID}`,
  LIST_VIEW: '/',
  DETAIL_VIEW: '/detail/:pkgkey/:panel?',
};

export const routes = [
  <Route key="home" path={patterns.LIST_VIEW} exact={true} component={Home} />,
  <Route
    key="detail"
    path={patterns.DETAIL_VIEW}
    exact={true}
    render={(props: DetailMatch) => <Detail {...props.match.params} />}
  />,
];

interface DetailMatch {
  match: {
    params: DetailProps;
  };
}
