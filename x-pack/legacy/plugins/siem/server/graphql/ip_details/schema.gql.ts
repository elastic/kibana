/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

const ipOverviewSchema = gql`
  type AutonomousSystemOrganization {
    name: String
  }

  type AutonomousSystem {
    number: Float
    organization: AutonomousSystemOrganization
  }

  type Overview {
    firstSeen: Date
    lastSeen: Date
    autonomousSystem: AutonomousSystem!
    geo: GeoEcsFields!
  }

  type IpOverviewData {
    client: Overview
    destination: Overview
    host: HostEcsFields!
    server: Overview
    source: Overview
    inspect: Inspect
  }

  extend type Source {
    IpOverview(
      id: String
      filterQuery: String
      ip: String!
      defaultIndex: [String!]!
    ): IpOverviewData
  }
`;

const tlsSchema = gql`
  enum TlsFields {
    _id
  }
  type TlsNode {
    _id: String
    timestamp: Date
    alternativeNames: [String!]
    notAfter: [String!]
    commonNames: [String!]
    ja3: [String!]
    issuerNames: [String!]
  }
  input TlsSortField {
    field: TlsFields!
    direction: Direction!
  }
  type TlsEdges {
    node: TlsNode!
    cursor: CursorType!
  }
  type TlsData {
    edges: [TlsEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
  }
  extend type Source {
    Tls(
      filterQuery: String
      id: String
      ip: String!
      pagination: PaginationInputPaginated!
      sort: TlsSortField!
      flowTarget: FlowTarget!
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): TlsData!
  }
`;

const usersSchema = gql`
  enum UsersFields {
    name
    count
  }

  input UsersSortField {
    field: UsersFields!
    direction: Direction!
  }

  type UsersItem {
    name: String
    id: ToStringArray
    groupId: ToStringArray
    groupName: ToStringArray
    count: Float
  }

  type UsersNode {
    _id: String
    timestamp: Date
    user: UsersItem
  }

  type UsersEdges {
    node: UsersNode!
    cursor: CursorType!
  }

  type UsersData {
    edges: [UsersEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
  }

  extend type Source {
    Users(
      filterQuery: String
      id: String
      ip: String!
      pagination: PaginationInputPaginated!
      sort: UsersSortField!
      flowTarget: FlowTarget!
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): UsersData!
  }
`;

export const ipDetailsSchemas = [ipOverviewSchema, tlsSchema, usersSchema];
