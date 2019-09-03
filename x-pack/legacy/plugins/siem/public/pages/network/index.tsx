/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { pure } from 'recompose';

import { i18n } from '@kbn/i18n';
import { NetworkComponentProps } from '../../components/link_to/redirect_to_network';

import { IPDetails } from './ip_details';
import { Network } from './network';
import { PageRoute } from '../../components/page_route/pageroute';

const networkPath = `/:pageName(network)`;
export const NetworkContainer = pure<NetworkComponentProps>(({ match }) => (
  <>
    <Switch>
      <Route
        strict
        exact
        path={networkPath}
        render={props => (
          <PageRoute
            {...props}
            component={Network}
            title={i18n.translate('xpack.siem.pages.network.networkTitle', {
              defaultMessage: 'Network',
            })}
          />
        )}
      />
      <Route
        path={`${networkPath}/ip/:ip`}
        render={props => (
          <PageRoute {...props} component={IPDetails} title={props.match.params.ip} />
        )}
      />
      <Redirect from="/network/" to="/network" />
    </Switch>
  </>
));

NetworkContainer.displayName = 'NetworkContainer';
