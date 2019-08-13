/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';
import { QueryString } from 'ui/utils/query_string';
import { pure } from 'recompose';
import { addEntitiesToKql } from './add_entities_to_kql';
import { replaceKQLParts } from './replace_kql_parts';
import { emptyEntity, multipleEntities, getMultipleEntities } from './entity_helpers';
import { replaceKqlQueryLocationForHostPage } from './replace_kql_query_location_for_host_page';

interface MlHostConditionalProps {
  match: RouteMatch<{}>;
  location: Location;
}

interface QueryStringType {
  '?_g': string;
  kqlQuery: string | null;
  timerange: string | null;
}

export const MlHostConditionalContainer = pure<MlHostConditionalProps>(({ match }) => (
  <Switch>
    <Route
      strict
      exact
      path={match.url}
      render={({ location }) => {
        const queryStringDecoded: QueryStringType = QueryString.decode(
          location.search.substring(1)
        );
        if (queryStringDecoded.kqlQuery != null) {
          queryStringDecoded.kqlQuery = replaceKQLParts(queryStringDecoded.kqlQuery);
        }
        const reEncoded = QueryString.encode(queryStringDecoded);
        return <Redirect to={`/hosts?${reEncoded}`} />;
      }}
    />
    <Route
      path={`${match.url}/:hostName`}
      render={({
        location,
        match: {
          params: { hostName },
        },
      }) => {
        const queryStringDecoded: QueryStringType = QueryString.decode(
          location.search.substring(1)
        );
        if (queryStringDecoded.kqlQuery != null) {
          queryStringDecoded.kqlQuery = replaceKQLParts(queryStringDecoded.kqlQuery);
        }
        if (emptyEntity(hostName)) {
          if (queryStringDecoded.kqlQuery != null) {
            queryStringDecoded.kqlQuery = replaceKqlQueryLocationForHostPage(
              queryStringDecoded.kqlQuery
            );
          }
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/hosts?${reEncoded}`} />;
        } else if (multipleEntities(hostName)) {
          const hosts: string[] = getMultipleEntities(hostName);
          if (queryStringDecoded.kqlQuery != null) {
            queryStringDecoded.kqlQuery = addEntitiesToKql(
              ['host.name'],
              hosts,
              queryStringDecoded.kqlQuery
            );
            queryStringDecoded.kqlQuery = replaceKqlQueryLocationForHostPage(
              queryStringDecoded.kqlQuery
            );
          }
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/hosts?${reEncoded}`} />;
        } else {
          const reEncoded = QueryString.encode(queryStringDecoded);
          return <Redirect to={`/hosts/${hostName}?${reEncoded}`} />;
        }
      }}
    />
    <Redirect from="/ml-hosts/" to="/ml-hosts" />
  </Switch>
));
