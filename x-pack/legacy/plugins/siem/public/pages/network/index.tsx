/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { SiemPageName } from '../home/types';
import { IPDetails } from './ip_details';
import { Network } from './network';

const networkPagePath = `/:pageName(${SiemPageName.network})`;
const ipDetailsPagePath = networkPagePath + '/ip/:detailName';

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const NetworkContainer = React.memo<Props>(() => (
  <Switch>
    <Route strict exact path={networkPagePath} render={() => <Network />} />
    <Route
      path={ipDetailsPagePath}
      render={({
        match: {
          params: { detailName },
        },
      }) => <IPDetails detailName={detailName} />}
    />
    <Route
      path={`/${SiemPageName.network}/`}
      render={({ location: { search = '' } }) => (
        <Redirect to={`/${SiemPageName.network}${search}`} />
      )}
    />
  </Switch>
));

NetworkContainer.displayName = 'NetworkContainer';
