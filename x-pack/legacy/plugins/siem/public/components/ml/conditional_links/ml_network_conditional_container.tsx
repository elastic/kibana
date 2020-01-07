/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';
import { QueryString } from 'ui/utils/query_string';
import { addEntitiesToKql } from './add_entities_to_kql';
import { replaceKQLParts } from './replace_kql_parts';
import { emptyEntity, getMultipleEntities, multipleEntities } from './entity_helpers';
import { SiemPageName } from '../../../pages/home/types';

interface QueryStringType {
  '?_g': string;
  query: string | null;
  timerange: string | null;
}

type MlNetworkConditionalProps = Partial<RouteComponentProps<{}>> & { url: string };

export const MlNetworkConditionalContainer = React.memo<MlNetworkConditionalProps>(({ url }) => (
  <Switch>
    <Route
      path={url}
      render={({ location }) => {
        const queryStringDecoded: QueryStringType = QueryString.decode(
          location.search.substring(1)
        );
        if (queryStringDecoded.query != null) {
          queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
        }
        const reEncoded = QueryString.encode(queryStringDecoded);
        return <Redirect to={`/${SiemPageName.network}?${reEncoded}`} />;
      }}
      exact
      strict
    />
    <Route
      path={`${url}/ip/:ip`}
      render={({
        location,
        match: {
          params: { ip },
        },
      }) => {
        const queryStringDecoded: QueryStringType = QueryString.decode(
          location.search.substring(1)
        );
        if (queryStringDecoded.query != null) {
          queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
        }
        if (emptyEntity(ip)) {
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/${SiemPageName.network}?${reEncoded}`} />;
        } else if (multipleEntities(ip)) {
          const ips: string[] = getMultipleEntities(ip);
          queryStringDecoded.query = addEntitiesToKql(
            ['source.ip', 'destination.ip'],
            ips,
            queryStringDecoded.query || ''
          );
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/${SiemPageName.network}?${reEncoded}`} />;
        } else {
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/${SiemPageName.network}/ip/${ip}?${reEncoded}`} />;
        }
      }}
    />
    <Route
      path="/ml-network/"
      render={({ location: { search = '' } }) => (
        <Redirect from="/ml-network/" to={`/ml-network${search}`} />
      )}
    />
  </Switch>
));

MlNetworkConditionalContainer.displayName = 'MlNetworkConditionalContainer';
