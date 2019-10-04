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
import { replaceKqlQueryLocationForNetworkPage } from './replace_kql_query_location_for_network_page';

interface QueryStringType {
  '?_g': string;
  kqlQuery: string | null;
  timerange: string | null;
}

type MlNetworkConditionalProps = Partial<RouteComponentProps<{}>> & { url: string };

export const MlNetworkConditionalContainer = React.memo<MlNetworkConditionalProps>(({ url }) => (
  <Switch>
    <Route
      strict
      exact
      path={url}
      render={({ location }) => {
        const queryStringDecoded: QueryStringType = QueryString.decode(
          location.search.substring(1)
        );
        if (queryStringDecoded.kqlQuery != null) {
          queryStringDecoded.kqlQuery = replaceKQLParts(queryStringDecoded.kqlQuery);
        }
        const reEncoded = QueryString.encode(queryStringDecoded);
        return <Redirect to={`/network?${reEncoded}`} />;
      }}
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
        if (queryStringDecoded.kqlQuery != null) {
          queryStringDecoded.kqlQuery = replaceKQLParts(queryStringDecoded.kqlQuery);
        }
        if (emptyEntity(ip)) {
          if (queryStringDecoded.kqlQuery != null) {
            queryStringDecoded.kqlQuery = replaceKqlQueryLocationForNetworkPage(
              queryStringDecoded.kqlQuery
            );
          }
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/network?${reEncoded}`} />;
        } else if (multipleEntities(ip)) {
          const ips: string[] = getMultipleEntities(ip);
          if (queryStringDecoded.kqlQuery != null) {
            queryStringDecoded.kqlQuery = addEntitiesToKql(
              ['source.ip', 'destination.ip'],
              ips,
              queryStringDecoded.kqlQuery
            );
            queryStringDecoded.kqlQuery = replaceKqlQueryLocationForNetworkPage(
              queryStringDecoded.kqlQuery
            );
          }
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/network?${reEncoded}`} />;
        } else {
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/network/ip/${ip}?${reEncoded}`} />;
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
