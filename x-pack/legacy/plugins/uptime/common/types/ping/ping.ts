/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

// {
//   "id": "deQ8cHABC7VDoh7Q0UMK",
//   "timestamp": "2020-02-23T04:09:57.792Z",
//   "@timestamp": "2020-02-23T04:09:57.792Z",
//   "resolve": {
//       "ip": "127.0.0.1",
//       "rtt": {
//           "us": 711
//       }
//   },
//   "url": {
//       "scheme": "http",
//       "domain": "localhost",
//       "port": 5678,
//       "path": "/pattern",
//       "query": "r=200x1",
//       "full": "http://localhost:5678/pattern?r=200x1"
//   },
//   "event": {
//       "dataset": "uptime"
//   },
//   "ecs": {
//       "version": "1.4.0"
//   },
//   "summary": {
//       "up": 0,
//       "down": 1
//   },
//   "monitor": {
//       "status": "down",
//       "duration": {
//           "us": 4259
//       },
//       "id": "0099-up",
//       "name": "Test 0099 - up",
//       "type": "http",
//       "timespan": {
//           "gte": "2020-02-23T04:09:57.792Z",
//           "lt": "2020-02-23T04:10:27.792Z"
//       },
//       "check_group": "48ac99ce-55f2-11ea-ab0b-acde48001122",
//       "ip": "127.0.0.1"
//   },
//   "error": {
//       "type": "io",
//       "message": "Get http://localhost:5678/pattern?r=200x1: dial tcp 127.0.0.1:5678: connect: connection refused"
//   },
//   "agent": {
//       "ephemeral_id": "33099805-35cc-48cb-88ef-94f77ceb0efb",
//       "hostname": "Justins-MacBook-Pro.local",
//       "id": "5884d7f7-9a49-4b0e-bff2-72a475aa695f",
//       "version": "8.0.0",
//       "type": "heartbeat"
//   },
//   "observer": {
//       "hostname": "Justins-MacBook-Pro.local",
//       "geo": {
//           "name": "fairbanks",
//           "location": "37.926868, -78.024902"
//       }
//   }
// }

export const NewPingType = t.type({
  id: t.string,
  timestamp: t.string,
  '@timestamp': t.string,
  resolve: t.partial({
    ip: t.string,
    rtt: t.type({
      us: t.number,
    }),
  }),
  url: t.partial({
    scheme: t.string,
    domain: t.string,
    port: t.number,
    path: t.string,
    query: t.string,
    full: t.string,
  }),
  event: t.partial({
    dataset: t.string,
  }),
  ecs: t.partial({
    version: t.string,
  }),
  summary: t.partial({
    up: t.number,
    down: t.number,
  }),
  monitor: t.partial({
    status: t.string,
    duration: t.partial({
      us: t.number,
    }),
    id: t.string,
    name: t.string,
    type: t.string,
    timespan: t.type({
      gte: t.string,
      lt: t.string,
    }),
    check_group: t.string,
    ip: t.string,
  }),
  error: t.partial({
    type: t.string,
    message: t.string,
  }),
  agent: t.partial({
    ephemeral_id: t.string,
    hostname: t.string,
    id: t.string,
    version: t.string,
    type: t.string,
  }),
  observer: t.partial({
    hostname: t.string,
    geo: t.partial({
      name: t.string,
      location: t.string,
    }),
  }),
});

export type NewPing = t.TypeOf<typeof NewPingType>;

export const PingsResponseType = t.type({
  total: t.number,
  locations: t.array(t.string),
  pings: t.array(NewPingType),
});

export type PingsResponse = t.TypeOf<typeof PingsResponseType>;

export interface GetPingsParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  location?: string;
  monitorId?: string;
  size?: number;
  sort?: string;
  status?: string;
}

export interface PingsResult {
  total: number;
  locations: string[];
  pings: NewPing[];
}
