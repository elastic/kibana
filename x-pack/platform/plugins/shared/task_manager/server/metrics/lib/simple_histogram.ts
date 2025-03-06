/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { last } from 'lodash';

interface Bucket {
  min: number; // inclusive
  max: number; // exclusive
  count: number;
}

export interface SerializedHistogram extends JsonObject {
  counts: number[];
  values: number[];
}

export class SimpleHistogram {
  private maxValue: number;
  private bucketSize: number;
  private histogramBuckets: Bucket[] = [];
  private allValues: number[] = [];

  constructor(max: number, bucketSize: number) {
    if (bucketSize > max) {
      throw new Error(`bucket size cannot be greater than value range`);
    }

    this.maxValue = max;
    this.bucketSize = bucketSize;
    this.initializeBuckets();
  }

  public reset() {
    for (let i = 0; i < this.histogramBuckets.length; i++) {
      this.histogramBuckets[i].count = 0;
    }
    this.allValues = [];
  }

  public record(value: number, increment: number = 1) {
    if (value < 0 || value > this.maxValue) {
      return;
    }

    for (let i = 0; i < this.histogramBuckets.length; i++) {
      if (value >= this.histogramBuckets[i].min && value < this.histogramBuckets[i].max) {
        this.histogramBuckets[i].count += increment;

        break;
      }
    }

    for (let i = 0; i < increment; i++) {
      this.allValues.push(value);
    }
  }

  public get(truncate: boolean = false) {
    let histogramToReturn = this.histogramBuckets;

    if (truncate) {
      // find the index of the last bucket with a non-zero value
      const nonZeroCountsWithIndex = this.histogramBuckets
        .map((bucket: Bucket, index: number) => ({ count: bucket.count, index }))
        .filter(({ count }) => count > 0);
      const lastNonZeroIndex: number =
        nonZeroCountsWithIndex.length > 0 ? last(nonZeroCountsWithIndex)?.index ?? -1 : -1;
      histogramToReturn =
        lastNonZeroIndex >= 0 ? this.histogramBuckets.slice(0, lastNonZeroIndex + 1) : [];
    }

    return histogramToReturn.map((bucket: Bucket) => ({
      count: bucket.count,
      value: bucket.max,
    }));
  }

  public getAllValues(truncate: boolean = false) {
    return this.allValues.slice();
  }

  public serialize(): SerializedHistogram {
    const counts: number[] = [];
    const values: number[] = [];

    for (const { count, value } of this.get(true)) {
      counts.push(count);
      values.push(value);
    }

    return { counts, values };
  }

  private initializeBuckets() {
    let i = 0;
    while (i < this.maxValue) {
      this.histogramBuckets.push({
        min: i,
        max: i + Math.min(this.bucketSize, this.maxValue),
        count: 0,
      });
      i += this.bucketSize;
    }
  }
}
