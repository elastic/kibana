/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InternalFields } from '@kbn/event-log-plugin/server/es/cluster_client_adapter';
import { GapStatus, gapStatus } from '../../../../common/constants';

import { Interval, StringInterval, GapBase } from '../types';

import {
  mergeIntervals,
  subtractAllIntervals,
  sumIntervalsDuration,
  intervalDuration,
  subtractIntervals,
  normalizeInterval,
  denormalizeInterval,
  clipInterval,
} from './interval_utils';

interface GapConstructorParams {
  timestamp?: string;
  range: StringInterval;
  filledIntervals?: StringInterval[];
  inProgressIntervals?: StringInterval[];
  internalFields?: InternalFields;
}

export class Gap {
  private _range: Interval;
  private _filledIntervals: Interval[];
  private _inProgressIntervals: Interval[];
  private _internalFields?: InternalFields;
  private _timestamp?: string;

  constructor({
    timestamp,
    range,
    filledIntervals = [],
    inProgressIntervals = [],
    internalFields,
  }: GapConstructorParams) {
    this._range = normalizeInterval(range);
    this._filledIntervals = mergeIntervals(filledIntervals.map(normalizeInterval));
    this._inProgressIntervals = mergeIntervals(inProgressIntervals.map(normalizeInterval));
    if (internalFields) {
      this._internalFields = internalFields;
    }
    if (timestamp) {
      this._timestamp = timestamp;
    }
  }

  public fillGap(interval: Interval): void {
    const clippedInterval = clipInterval(interval, this.range);
    if (clippedInterval === null) return;

    const newFilledIntervals = mergeIntervals([...this.filledIntervals, clippedInterval]);
    this._filledIntervals = newFilledIntervals;
    const newInProgressIntervals = subtractAllIntervals(
      this.inProgressIntervals,
      newFilledIntervals
    );
    this._inProgressIntervals = newInProgressIntervals;
  }

  public addInProgress(interval: Interval): void {
    const clippedInterval = clipInterval(interval, this.range);
    if (clippedInterval === null) return;

    const inProgressIntervals = subtractAllIntervals([clippedInterval], this.filledIntervals);
    this._inProgressIntervals = mergeIntervals([
      ...this.inProgressIntervals,
      ...inProgressIntervals,
    ]);
  }

  public get range() {
    return this._range;
  }

  public get filledIntervals() {
    return this._filledIntervals;
  }

  public get inProgressIntervals() {
    return this._inProgressIntervals;
  }

  public get timestamp() {
    return this._timestamp;
  }

  /**
   * unfilled = range - (filled + inProgress)
   */
  public get unfilledIntervals(): Interval[] {
    const combined = mergeIntervals([...this.filledIntervals, ...this.inProgressIntervals]);
    return subtractIntervals(this.range, combined);
  }

  public get totalGapDurationMs(): number {
    return intervalDuration(this.range);
  }

  public get filledGapDurationMs(): number {
    return sumIntervalsDuration(this.filledIntervals);
  }

  public get unfilledGapDurationMs(): number {
    return sumIntervalsDuration(this.unfilledIntervals);
  }

  public get inProgressGapDurationMs(): number {
    return sumIntervalsDuration(this.inProgressIntervals);
  }

  public get status(): GapStatus {
    if (this.filledGapDurationMs === 0) {
      return gapStatus.UNFILLED;
    } else if (this.unfilledGapDurationMs === 0 && this.inProgressGapDurationMs === 0) {
      return gapStatus.FILLED;
    } else {
      return gapStatus.PARTIALLY_FILLED;
    }
  }

  public resetInProgressIntervals(): void {
    this._inProgressIntervals = [];
  }

  public get internalFields() {
    return this._internalFields;
  }

  public getState() {
    return {
      range: denormalizeInterval(this.range),
      filledIntervals: this.filledIntervals.map(denormalizeInterval),
      inProgressIntervals: this.inProgressIntervals.map(denormalizeInterval),
      unfilledIntervals: this.unfilledIntervals.map(denormalizeInterval),
      status: this.status,
      totalGapDurationMs: this.totalGapDurationMs,
      filledDurationMs: this.filledGapDurationMs,
      unfilledDurationMs: this.unfilledGapDurationMs,
      inProgressDurationMs: this.inProgressGapDurationMs,
    };
  }

  /**
   * Returns the gap object for es
   */
  public toObject(): GapBase {
    return {
      range: denormalizeInterval(this.range),
      filled_intervals: this.filledIntervals.map(denormalizeInterval),
      in_progress_intervals: this.inProgressIntervals.map(denormalizeInterval),
      unfilled_intervals: this.unfilledIntervals.map(denormalizeInterval),
      status: this.status,
      total_gap_duration_ms: this.totalGapDurationMs,
      filled_duration_ms: this.filledGapDurationMs,
      unfilled_duration_ms: this.unfilledGapDurationMs,
      in_progress_duration_ms: this.inProgressGapDurationMs,
    };
  }
}
