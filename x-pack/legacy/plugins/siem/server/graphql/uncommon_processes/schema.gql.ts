/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const uncommonProcessesSchema = gql`
  type UncommonProcessItem {
    _id: String!
    instances: Float!
    process: ProcessEcsFields!
    hosts: [HostEcsFields!]!
    user: UserEcsFields
  }

  type UncommonProcessesEdges {
    node: UncommonProcessItem!
    cursor: CursorType!
  }

  type UncommonProcessesData {
    edges: [UncommonProcessesEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified"
    UncommonProcesses(
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
      defaultIndex: [String!]!
    ): UncommonProcessesData!
  }
`;
