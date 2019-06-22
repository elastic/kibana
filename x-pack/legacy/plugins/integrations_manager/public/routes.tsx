/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { generatePath, Route } from 'react-router-dom';
import { Detail } from './screens/detail';
import { Home } from './screens/home';
import { PLUGIN_ID } from '../common/constants';

export const APP_ROOT = `/app/${PLUGIN_ID}`;

// the `*_VIEW` routes are relative to `APP_ROOT`
export const LIST_VIEW = '/';

export const DETAIL_VIEW = '/detail/:pkgkey';

interface DetailMatch {
  match: {
    params: {
      pkgkey: string;
    };
  };
}

export const linkToDetailView = ({ name, version }: { name: string; version: string }) =>
  generatePath(DETAIL_VIEW, { pkgkey: `${name}-${version}` });

export const routes = [
  <Route key="home" path={LIST_VIEW} exact={true} component={Home} />,
  <Route
    key="detail"
    path={DETAIL_VIEW}
    exact={true}
    render={(props: DetailMatch) => <Detail package={props.match.params.pkgkey} />}
  />,
];
