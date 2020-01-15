/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const authenticationsSchema = gql`
  type LastSourceHost {
    timestamp: Date
    source: SourceEcsFields
    host: HostEcsFields
  }

  type AuthenticationItem {
    _id: String!
    failures: Float!
    successes: Float!
    user: UserEcsFields!
    lastSuccess: LastSourceHost
    lastFailure: LastSourceHost
  }

  type AuthenticationsEdges {
    node: AuthenticationItem!
    cursor: CursorType!
  }

  type AuthenticationsData {
    edges: [AuthenticationsEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
  }

  extend type Source {
    "Gets Authentication success and failures based on a timerange"
    Authentications(
      timerange: TimerangeInput!
      pagination: PaginationInputPaginated!
      filterQuery: String
      defaultIndex: [String!]!
    ): AuthenticationsData!
  }
`;
