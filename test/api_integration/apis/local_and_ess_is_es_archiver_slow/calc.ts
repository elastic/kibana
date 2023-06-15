/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint no-console: ["error",{ allow: ["log"] }] */

import * as M from 'fp-ts/Monoid';
import { pipe, flow } from 'fp-ts/function';
import { LoadResults, TimeTakenToLoadArchive } from './shared.types';

const sum = M.fold(M.monoidSum);

type ReadOnlyNumberArray2NumberFn = (xs: readonly number[]) => number;

export const length: ReadOnlyNumberArray2NumberFn = (xs: readonly number[]) => xs.length;
export const avg: ReadOnlyNumberArray2NumberFn = (nums: readonly number[]) =>
  sum(nums) / length(nums);

const millisecondsReducer = (acc: TimeTakenToLoadArchive, curr: TimeTakenToLoadArchive) => {
  // TODO-TRE: Figure out how to not need the following ts-ignore:
  // @ts-ignore
  acc.push(curr.timeTaken.milliseconds);
  return acc;
};
export const computeAvgDiffTimes = (xs: readonly TimeTakenToLoadArchive[]): number =>
  // TODO-TRE: Figure out how to not need the following ts-ignore:
  // @ts-ignore
  avg(xs.reduce(millisecondsReducer, []));
export const seconds = (x: number) => x / 1000;
export const oneDecimal = (x: number) => x.toFixed(1);
// export const twoDecimals = (x: number) => x.toFixed(2);
export const secondsToOneDecimalPoint = flow(seconds, oneDecimal);
// export const secondsToTwoDecimalPoints = flow(seconds, twoDecimals);
export const averageSecondsToOneDecimalPoint = flow(avg, secondsToOneDecimalPoint);
// export const averageSecondsToTwoDecimalPoints = flow(avg, secondsToTwoDecimalPoints);
export const min = (ns: number[]) => Math.min(...ns);
export const max = (ns: number[]) => Math.max(...ns);
export async function computeAverageMinMax(results: LoadResults) {
  const xs = [];
  for (const r of results) {
    delete r.label;
    const ms: number[] = r.metrics!.map((x) => x.milliseconds);
    delete r.metrics;
    r.avg = pipe(ms, averageSecondsToOneDecimalPoint);
    r.min = pipe(ms, min, secondsToOneDecimalPoint);
    r.max = pipe(ms, max, secondsToOneDecimalPoint);
    // r.avg = pipe(ms, averageSecondsToTwoDecimalPoints);
    // r.min = pipe(ms, min, secondsToTwoDecimalPoints);
    // r.max = pipe(ms, max, secondsToTwoDecimalPoints);
    xs.push(r);
  }
  return xs;
}
