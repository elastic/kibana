/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';

import { RedirectToLogs } from './redirect_to_logs';
import { RedirectToNodeDetail } from './redirect_to_node_detail';
import { RedirectToNodeLogs } from './redirect_to_node_logs';
import { RedirectToHostDetailViaIP } from './redirect_to_host_detail_via_ip';
import { inventoryModels } from '../../../common/inventory_models';

interface LinkToPageProps {
  match: RouteMatch<{}>;
}

const ITEM_TYPES = inventoryModels.map(m => m.id).join('|');

export const LinkToPage: React.FC<LinkToPageProps> = props => (
  <Switch>
    <Route
      path={`${props.match.url}/:sourceId?/:nodeType(${ITEM_TYPES})-logs/:nodeId`}
      component={RedirectToNodeLogs}
    />
    <Route
      path={`${props.match.url}/:nodeType(${ITEM_TYPES})-detail/:nodeId`}
      component={RedirectToNodeDetail}
    />
    <Route
      path={`${props.match.url}/host-detail-via-ip/:hostIp`}
      component={RedirectToHostDetailViaIP}
    />
    <Route path={`${props.match.url}/:sourceId?/logs`} component={RedirectToLogs} />
    <Redirect to="/infrastructure" />
  </Switch>
);
