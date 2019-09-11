/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { Policy, InputsRange, TimeRange, GlobalQuery } from '../../store/inputs/model';

export const getPolicy = (inputState: InputsRange): Policy => inputState.policy;

export const getTimerange = (inputState: InputsRange): TimeRange => inputState.timerange;

export const getQuery = (inputState: InputsRange): GlobalQuery[] => inputState.query;

export const policySelector = () =>
  createSelector(
    getPolicy,
    policy => policy.kind
  );

export const durationSelector = () =>
  createSelector(
    getPolicy,
    policy => policy.duration
  );

export const kindSelector = () =>
  createSelector(
    getTimerange,
    timerange => timerange.kind
  );

export const startSelector = () =>
  createSelector(
    getTimerange,
    timerange => timerange.from
  );

export const endSelector = () =>
  createSelector(
    getTimerange,
    timerange => timerange.to
  );

export const fromStrSelector = () =>
  createSelector(
    getTimerange,
    timerange => timerange.fromStr
  );

export const toStrSelector = () =>
  createSelector(
    getTimerange,
    timerange => timerange.toStr
  );

export const isLoadingSelector = () =>
  createSelector(
    getQuery,
    query => query.some(i => i.loading === true)
  );

export const queriesSelector = () =>
  createSelector(
    getQuery,
    query => query.filter(q => q.id !== 'kql')
  );

export const kqlQuerySelector = () =>
  createSelector(
    getQuery,
    query => query.find(q => q.id === 'kql')
  );
