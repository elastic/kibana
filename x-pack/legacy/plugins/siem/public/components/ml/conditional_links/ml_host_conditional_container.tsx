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
import { emptyEntity, multipleEntities, getMultipleEntities } from './entity_helpers';
import { SiemPageName } from '../../../pages/home/types';
import { HostsTableType } from '../../../store/hosts/model';

interface QueryStringType {
  '?_g': string;
  query: string | null;
  timerange: string | null;
}

type MlHostConditionalProps = Partial<RouteComponentProps<{}>> & { url: string };

export const MlHostConditionalContainer = React.memo<MlHostConditionalProps>(({ url }) => (
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
        return <Redirect to={`/${SiemPageName.hosts}?${reEncoded}`} />;
      }}
      exact
      strict
    />
    <Route
      path={`${url}/:hostName`}
      render={({
        location,
        match: {
          params: { hostName },
        },
      }) => {
        const queryStringDecoded: QueryStringType = QueryString.decode(
          location.search.substring(1)
        );
        if (queryStringDecoded.query != null) {
          queryStringDecoded.query = replaceKQLParts(queryStringDecoded.query);
        }
        if (emptyEntity(hostName)) {
          const reEncoded = QueryString.encode(queryStringDecoded);
          return (
            <Redirect to={`/${SiemPageName.hosts}/${HostsTableType.anomalies}?${reEncoded}`} />
          );
        } else if (multipleEntities(hostName)) {
          const hosts: string[] = getMultipleEntities(hostName);
          queryStringDecoded.query = addEntitiesToKql(
            ['host.name'],
            hosts,
            queryStringDecoded.query || ''
          );
          const reEncoded = QueryString.encode(queryStringDecoded);
          return (
            <Redirect to={`/${SiemPageName.hosts}/${HostsTableType.anomalies}?${reEncoded}`} />
          );
        } else {
          const reEncoded = QueryString.encode(queryStringDecoded);
          return (
            <Redirect
              to={`/${SiemPageName.hosts}/${hostName}/${HostsTableType.anomalies}?${reEncoded}`}
            />
          );
        }
      }}
    />
    <Route
      path="/ml-hosts/"
      render={({ location: { search = '' } }) => (
        <Redirect from="/ml-hosts/" to={`/ml-hosts${search}`} />
      )}
    />
  </Switch>
));

MlHostConditionalContainer.displayName = 'MlHostConditionalContainer';
