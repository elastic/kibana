/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlRow } from './mappers/esql_rows';
import type { DestinationQueryRef } from './query_refs';
import { getS3AuthFailures } from './s3_auth_failures';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const baseParams = { unitId: 'default', window };

const destination = (id: string): DestinationQueryRef => ({ kind: 'destination', id, type: 's3' });

const requestRate = (value: number | null) => ({ value, unit: '{request}', time_unit: 's' });

const row = (id: string, reason: string | null, failedRate: number): EsqlRow => ({
  id,
  reason,
  failed_rate: failedRate,
});

const run = ({
  rows = [],
  destinations = [destination('s3-test')],
  onFailure = jest.fn(),
}: {
  rows?: EsqlRow[];
  destinations?: DestinationQueryRef[];
  onFailure?: jest.Mock;
} = {}) => {
  const runQuery = jest.fn(async () => rows);
  const result = getS3AuthFailures({
    runQuery,
    baseParams,
    destinations,
    parentResults: {},
    onFailure,
  });

  return { runQuery, onFailure, result };
};

describe('getS3AuthFailures', () => {
  it('sums the rates of the codes of each class, and lists the codes of the class', async () => {
    const { result } = run({
      rows: [
        row('s3-test', null, 0),
        row('s3-test', 'SignatureDoesNotMatch', 0.146),
        row('s3-test', 'InvalidAccessKeyId', 0.061),
        row('s3-test', 'AccessDenied', 0.5),
      ],
    });

    expect(await result).toEqual({
      's3-test': {
        authentication: {
          rate: requestRate(0.146 + 0.061),
          breakdown: [
            { collection: null, reason: 'SignatureDoesNotMatch', rate: requestRate(0.146) },
            { collection: null, reason: 'InvalidAccessKeyId', rate: requestRate(0.061) },
          ],
        },
        authorization: {
          rate: requestRate(0.5),
          breakdown: [{ collection: null, reason: 'AccessDenied', rate: requestRate(0.5) }],
        },
      },
    });
  });

  it('gives a rate of 0 and no breakdown when the destination has duration data and no such failure', async () => {
    const { result } = run({ rows: [row('s3-test', null, 0)] });

    expect(await result).toEqual({
      's3-test': {
        authentication: { rate: requestRate(0) },
        authorization: { rate: requestRate(0) },
      },
    });
  });

  it('does not count the codes that have no class, in a rate or in a breakdown', async () => {
    const { result } = run({
      rows: [row('s3-test', 'NoSuchBucket', 1), row('s3-test', 'timeout', 2)],
    });

    expect(await result).toEqual({
      's3-test': {
        authentication: { rate: requestRate(0) },
        authorization: { rate: requestRate(0) },
      },
    });
  });

  it('leaves out a destination with no rows, which has no data', async () => {
    const { result } = run({
      destinations: [destination('s3-test'), destination('s3-quiet')],
      rows: [row('s3-test', 'AccessDenied', 0.5)],
    });

    expect(Object.keys(await result)).toEqual(['s3-test']);
  });

  it('asks once for all destinations, whatever their failed rate', async () => {
    const { runQuery, result } = run({
      destinations: [destination('s3-test'), destination('s3-other')],
    });
    await result;

    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing when there are no destinations', async () => {
    const { runQuery, result } = run({ destinations: [] });

    expect(await result).toEqual({});
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('tells onFailure and gives no failures when the query fails', async () => {
    const error = new Error('boom');
    const onFailure = jest.fn();

    const result = await getS3AuthFailures({
      runQuery: jest.fn().mockRejectedValue(error),
      baseParams,
      destinations: [destination('s3-test')],
      parentResults: {},
      onFailure,
    });

    expect(result).toEqual({});
    expect(onFailure).toHaveBeenCalledWith(
      error,
      'destination authentication and authorization rates'
    );
  });

  it('does not read the prototype for a destination id like "constructor"', async () => {
    const { result } = run({
      destinations: [destination('constructor')],
      rows: [row('constructor', 'AccessDenied', 0.5)],
    });

    expect(Object.keys(await result)).toEqual(['constructor']);
  });
});
