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
/** The share of `whole` attempts per second that `part` is. */
const share = (part: number, whole: number | null) => ({
  value: whole === null || whole <= 0 ? null : (part / whole) * 100,
  unit: '%',
});

/** Every row of a destination has the attempts rate of the destination. */
const row = (
  id: string,
  reason: string | null,
  failedRate: number,
  attemptsRate: number | null = 1
): EsqlRow => ({
  id,
  reason,
  failed_rate: failedRate,
  attempts_rate: attemptsRate,
});

const run = ({
  rows = [],
  destinations = [destination('s3-test')],
}: {
  rows?: EsqlRow[];
  destinations?: DestinationQueryRef[];
} = {}) => {
  const runQuery = jest.fn(async () => rows);
  const result = getS3AuthFailures({
    runQuery,
    baseParams,
    destinations,
    parentResults: {},
  });

  return { runQuery, result };
};

describe('getS3AuthFailures', () => {
  it('sums the rates of the codes of each class, and lists the codes of the class', async () => {
    const { result } = run({
      rows: [
        row('s3-test', null, 0, 2),
        row('s3-test', 'SignatureDoesNotMatch', 0.146, 2),
        row('s3-test', 'InvalidAccessKeyId', 0.061, 2),
        row('s3-test', 'AccessDenied', 0.5, 2),
      ],
    });

    expect(await result).toEqual({
      's3-test': {
        failed: {
          rate: requestRate(0.146 + 0.061 + 0.5),
          percentage: share(0.146 + 0.061 + 0.5, 2),
        },
        authentication: {
          rate: requestRate(0.146 + 0.061),
          percentage: share(0.146 + 0.061, 2),
          breakdown: [
            {
              collection: null,
              reason: 'SignatureDoesNotMatch',
              rate: requestRate(0.146),
              percentage: share(0.146, 2),
            },
            {
              collection: null,
              reason: 'InvalidAccessKeyId',
              rate: requestRate(0.061),
              percentage: share(0.061, 2),
            },
          ],
        },
        authorization: {
          rate: requestRate(0.5),
          percentage: share(0.5, 2),
          breakdown: [
            {
              collection: null,
              reason: 'AccessDenied',
              rate: requestRate(0.5),
              percentage: share(0.5, 2),
            },
          ],
        },
      },
    });
  });

  it('gives a rate and a share of 0 and no breakdown when the destination has duration data and no failure', async () => {
    const { result } = run({ rows: [row('s3-test', null, 0)] });

    expect(await result).toEqual({
      's3-test': {
        failed: { rate: requestRate(0), percentage: share(0, 1) },
        authentication: { rate: requestRate(0), percentage: share(0, 1) },
        authorization: { rate: requestRate(0), percentage: share(0, 1) },
      },
    });
  });

  it('counts the codes that have no class in the total of failures, and not in a class or a breakdown', async () => {
    const { result } = run({
      rows: [row('s3-test', 'NoSuchBucket', 1, 4), row('s3-test', 'timeout', 2, 4)],
    });

    expect(await result).toEqual({
      's3-test': {
        failed: { rate: requestRate(3), percentage: share(3, 4) },
        authentication: { rate: requestRate(0), percentage: share(0, 4) },
        authorization: { rate: requestRate(0), percentage: share(0, 4) },
      },
    });
  });

  it('has no share when the destination has no attempts rate', async () => {
    const { result } = run({ rows: [row('s3-test', 'AccessDenied', 0.5, null)] });

    const { failed, authorization } = (await result)['s3-test'];
    expect(failed?.rate).toEqual(requestRate(0.5));
    expect(failed?.percentage).toEqual({ value: null, unit: '%' });
    expect(authorization.percentage).toEqual({ value: null, unit: '%' });
    expect(authorization.breakdown?.[0].percentage).toEqual({ value: null, unit: '%' });
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

  it('throws the error of the query when it fails', async () => {
    const error = new Error('boom');

    await expect(
      getS3AuthFailures({
        runQuery: jest.fn().mockRejectedValue(error),
        baseParams,
        destinations: [destination('s3-test')],
        parentResults: {},
      })
    ).rejects.toBe(error);
  });

  it('does not read the prototype for a destination id like "constructor"', async () => {
    const { result } = run({
      destinations: [destination('constructor')],
      rows: [row('constructor', 'AccessDenied', 0.5)],
    });

    expect(Object.keys(await result)).toEqual(['constructor']);
  });
});
