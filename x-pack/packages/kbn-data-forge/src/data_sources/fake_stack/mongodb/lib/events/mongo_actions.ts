/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize, sample } from 'lodash';
import { faker } from '@faker-js/faker';
import { v4 } from 'uuid';
import { Moment } from 'moment';
import { createBaseEvent } from './create_base_event';
import { MONGODB_HOSTS } from '../../../common/constants';
import { Doc } from '../../../../../types';

const getIpAddressAndPort = memoize((_source: string) => {
  const ip = faker.internet.ip();
  const port = faker.string.numeric(5);
  return `${ip}:${port}`;
});

export function generateRandomHexString(length: number) {
  const hexChars = '0123456789abcdef';
  let hexString = '';
  for (let i = 0; i < length; i++) {
    hexString += hexChars[Math.floor(Math.random() * hexChars.length)];
  }
  return hexString;
}

export function createMongoObject(obj: object) {
  function stringifyValue(value: any): string {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return `[${value.map(stringifyValue).join(', ')}]`;
      }
      return stringifyObject(value);
    }
    return JSON.stringify(value);
  }

  function stringifyObject(objToStringify: object) {
    return `{ _id: ObjectId("${generateRandomHexString(20)}"), ${Object.entries(objToStringify)
      .map(([key, value]) => `${key}: ${stringifyValue(value)}`)
      .join(', ')} }`;
  }

  return stringifyObject(obj);
}

export function wrapInConnection(
  timestamp: Moment,
  source: string,
  mongoHost: string,
  user: string,
  database: string,
  events: Doc[]
) {
  return [
    createBaseEvent(
      timestamp,
      mongoHost,
      'listener',
      'NETWORK',
      `connection accepted from ${getIpAddressAndPort(source)} #1 (1 connection now open)`,
      'INFO'
    ),
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'NETWORK',
      `received client metadata from ${getIpAddressAndPort(
        source
      )} conn1: { driver: { name: "nodejs", version: "4.1.1" }, os: { type: "Linux", name: "Ubuntu", architecture: "x86_64", version: "18.04" }, platform: "Node.js v12.13.0, LE, mongodb-core: 3.3.1" }`,
      'INFO'
    ),
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'ACCESS',
      `Successfully authenticated as user '${user}' on ${database}`,
      'INFO',
      database
    ),
    ...events,
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'NETWORK',
      `end connection ${getIpAddressAndPort(source)} (0 connections now open)`,
      'INFO'
    ),
  ];
}

export function createReadEvent(
  timestamp: Moment,
  source: string,
  user: string,
  database: string,
  collection: string
) {
  const mongoHost = sample(MONGODB_HOSTS) as string;
  const events = [
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'QUERY',
      `query ${database}.${collection} planSummary: COLLSCAN ntoreturn:0 ntoskip:0 nscanned:1000 keysExamined:0 docsExamined:1000 cursorExhausted:1 keyUpdates:0 numYields:1 locks(micros) r:2000 n:1000 rlim:5000 reslen:4027 0ms`
    ),
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'QUERY',
      `query ${database}.${collection} planSummary: IXSCAN { name: 1 } ntoreturn:0 ntoskip:0 nscanned:500 keysExamined:500 docsExamined:500 cursorExhausted:1 keyUpdates:0 numYields:1 locks(micros) r:2000 n:500 rlim:5000 reslen:2013 0ms`,
      'INFO',
      database,
      collection,
      'query'
    ),
  ];
  return wrapInConnection(timestamp, source, mongoHost, user, database, events);
}

export function createWriteEvent(
  timestamp: Moment,
  source: string,
  user: string,
  database: string,
  collection: string,
  document: object
) {
  const mongoHost = sample(MONGODB_HOSTS) as string;
  const events = [
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'COMMAND',
      `command ${database}.${collection} command: insert { documents: [ ${createMongoObject(
        document
      )} ], ordered: true, writeConcern: { w: "majority", wtimeout: 5000 } } numYields:0 reslen:67 locks:{ Global: { acquireCount: { r: 2, w: 2 } }, Database: { acquireCount: { w: 2 } }, Collection: { acquireCount: { w: 1 } } } storage:{ data: { bytesWritten: 160 } } protocol:op_msg 0ms`,
      'INFO',
      database,
      collection,
      'insert'
    ),
  ];

  return wrapInConnection(timestamp, source, mongoHost, user, database, events);
}

export function createDeleteEvent(
  timestamp: Moment,
  source: string,
  user: string,
  database: string,
  collection: string
) {
  const mongoHost = sample(MONGODB_HOSTS) as string;
  const events = [
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'COMMAND',
      `command ${database}.${collection} command: delete { q: { _id: ObjectId("${generateRandomHexString(
        20
      )}") }, limit: 1, writeConcern: { w: "majority", wtimeout: 5000 } } planSummary: IXSCAN { _id: 1 } keysExamined:1 docsExamined:1 nMatched:1 nRemoved:1 numYields:0 reslen:60 locks:{ Global: { acquireCount: { r: 2, w: 2 } }, Database: { acquireCount: { w: 1 } }, Collection: { acquireCount: { w: 1 } }, Mutex: { acquireCount: { r: 1 } } } storage:{ data: { bytesRead: 56, bytesWritten: 87 } } protocol:op_msg 0ms`,
      'INFO',
      database,
      collection,
      'delete'
    ),
  ];
  return wrapInConnection(timestamp, source, mongoHost, user, database, events);
}

export function createUpdateEvent(
  timestamp: Moment,
  source: string,
  user: string,
  database: string,
  collection: string,
  document: object
) {
  const mongoHost = sample(MONGODB_HOSTS) as string;
  const events = [
    createBaseEvent(
      timestamp,
      mongoHost,
      'conn1',
      'COMMAND',
      `command ${database}.${collection} command: update { update: { _id: ObjectId("${generateRandomHexString(
        20
      )}") }, updateObj: { $set: ${createMongoObject(
        document
      )} }, writeConcern: { w: "majority", wtimeout: 5000 }, lsid: { id: UUID("${v4()}") } } numYields:0 reslen:85 locks:{ Global: { acquireCount: { r: 2, w: 2 } }, Database: { acquireCount: { w: 2 } }, Collection: { acquireCount: { w: 1 } } } storage:{ data: { bytesWritten: 126 } } protocol:op_msg 0ms`,
      'INFO',
      database,
      collection,
      'updateObj'
    ),
  ];

  return wrapInConnection(timestamp, source, mongoHost, user, database, events);
}
