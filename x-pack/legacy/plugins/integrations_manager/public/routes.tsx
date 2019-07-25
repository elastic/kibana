/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { generatePath, Route } from 'react-router-dom';
import { npStart } from 'ui/new_platform';
import { Detail } from './screens/detail';
import { Home } from './screens/home';
import { PLUGIN_ID } from '../common/constants';

// patterns are used by React Router and are relative to `APP_ROOT`
export const patterns = {
  APP_ROOT: `/app/${PLUGIN_ID}`,
  LIST_VIEW: '/',
  DETAIL_VIEW: '/detail/:pkgkey',
};

interface DetailMatch {
  match: {
    params: {
      pkgkey: string;
    };
  };
}

const { prepend } = npStart.core.http.basePath;
// include '#' because we're using HashRouter
const prependRoot = (path: string) => prepend(patterns.APP_ROOT + '#' + path);

// TODO: get this from server/integrations/handlers.ts (move elsewhere?)
// seems like part of the name@version change
interface DetailParams {
  name: string;
  version: string;
}

export const routes = [
  <Route key="home" path={patterns.LIST_VIEW} exact={true} component={Home} />,
  <Route
    key="detail"
    path={patterns.DETAIL_VIEW}
    exact={true}
    render={(props: DetailMatch) => <Detail package={props.match.params.pkgkey} />}
  />,
];

// linkTo* are for EUILink and other places which need a full path
export const linkToListView = () => prependRoot(patterns.LIST_VIEW);

export const linkToDetailView = ({ name, version }: DetailParams) =>
  prependRoot(generatePath(patterns.DETAIL_VIEW, { pkgkey: `${name}-${version}` }));
