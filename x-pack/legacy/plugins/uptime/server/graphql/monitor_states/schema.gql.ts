/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorStatesSchema = gql`
  "Represents a monitor's statuses for a period of time."
  type SummaryHistogramPoint {
    "The time at which these data were collected."
    timestamp: String!
    "The number of documents at the given time period."
    count: Int!
    "The number of _up_ documents."
    up: Int!
    "The number of _down_ documents."
    down: Int!
  }

  type Agent {
    id: String!
  }

  type Check {
    agent: Agent
    monitor: CheckMonitor!
    observer: CheckObserver
    timestamp: String!
  }

  type CheckMonitor {
    ip: String
    status: String!
  }

  type Location {
    lat: Float
    lon: Float
  }

  type CheckGeo {
    name: String
    location: Location
  }

  type CheckObserver {
    geo: CheckGeo
  }

  type StateGeo {
    name: [String]
    location: Location
  }

  type StateObserver {
    geo: StateGeo
  }

  type MonitorState {
    status: String
    name: String
    id: String
    type: String
  }

  type Summary {
    up: Int
    down: Int
    geo: CheckGeo
  }

  type MonitorSummaryUrl {
    domain: String
    fragment: String
    full: String
    original: String
    password: String
    path: String
    port: Int
    query: String
    scheme: String
    username: String
  }

  type StateUrl {
    domain: String
    full: String
    path: String
    port: Int
    scheme: String
  }

  type State {
    agent: Agent
    checks: [Check!]
    geo: StateGeo
    observer: StateObserver
    monitor: MonitorState
    summary: Summary!
    timestamp: UnsignedInteger!
    url: StateUrl
  }

  type MonitorSummary {
    monitor_id: String!
    state: State!
    histogram: [SummaryHistogramPoint!]!
  }

  type MonitorSummaryResult {
    summaries: [MonitorSummary!]
    totalSummaryCount: DocCount!
  }

  type StatesIndexStatus {
    indexExists: Boolean!
    docCount: DocCount
  }

  extend type Query {
    getMonitorStates(
      pageIndex: Int!
      pageSize: Int!
      sortField: String
      sortDirection: String
    ): MonitorSummaryResult

    getStatesIndexStatus: StatesIndexStatus!
  }
`;
