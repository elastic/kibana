/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeKey } from '../time';
import { InfraLogEntry } from '../graphql/types';

export type LogEntry = InfraLogEntry;

export interface LogEntryOrigin {
  id: string;
  index: string;
  type: string;
}

export type LogEntryTime = TimeKey;

export interface LogEntryFieldsMapping {
  message: string;
  tiebreaker: string;
  time: string;
}

export function isEqual(time1: LogEntryTime, time2: LogEntryTime) {
  return time1.time === time2.time && time1.tiebreaker === time2.tiebreaker;
}

export function isLess(time1: LogEntryTime, time2: LogEntryTime) {
  return (
    time1.time < time2.time || (time1.time === time2.time && time1.tiebreaker < time2.tiebreaker)
  );
}

export function isLessOrEqual(time1: LogEntryTime, time2: LogEntryTime) {
  return (
    time1.time < time2.time || (time1.time === time2.time && time1.tiebreaker <= time2.tiebreaker)
  );
}

export function isBetween(min: LogEntryTime, max: LogEntryTime, operand: LogEntryTime) {
  return isLessOrEqual(min, operand) && isLessOrEqual(operand, max);
}
