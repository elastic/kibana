/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';
import { QueryString } from 'ui/utils/query_string';
import { pure } from 'recompose';
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

export const MlNetworkConditionalContainer = pure<MlNetworkConditionalProps>(({ url }) => (
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
          return <Redirect to={`/network/anomalies?${reEncoded}`} />;
        } else if (multipleEntities(ip)) {
          const ips: string[] = getMultipleEntities(ip);
          console.log('queryStringDecoded is', queryStringDecoded);
          console.log('found ips of:', ips);
          if (queryStringDecoded.kqlQuery != null) {
            console.log('queryStringDecoded.kqlQuery != null', queryStringDecoded.kqlQuery);
            queryStringDecoded.kqlQuery = addEntitiesToKql(
              ['source.ip', 'destination.ip'],
              ips,
              queryStringDecoded.kqlQuery
            );
            console.log('entities added to kql is:', queryStringDecoded.kqlQuery);
            queryStringDecoded.kqlQuery = replaceKqlQueryLocationForNetworkPage(
              queryStringDecoded.kqlQuery
            );
          }
          const reEncoded = QueryString.encode(queryStringDecoded);
          console.log(
            'multi-entities detected, redirecting to:',
            `/network/anomalies?${reEncoded}`
          );
          return <Redirect to={`/network/anomalies?${reEncoded}`} />;
        } else {
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/network/ip/${ip}/anomalies?${reEncoded}`} />;
        }
      }}
    />
    <Redirect from="/ml-network/" to="/ml-network" />
  </Switch>
));

MlNetworkConditionalContainer.displayName = 'MlNetworkConditionalContainer';
