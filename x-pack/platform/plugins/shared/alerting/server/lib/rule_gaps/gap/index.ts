/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InternalFields } from '@kbn/event-log-plugin/server/es/cluster_client_adapter';
import type { GapBase, Interval, StringInterval } from '../../../application/gaps/types';
import type { GapStatus } from '../../../../common/constants';
import { gapStatus } from '../../../../common/constants';

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
  ruleId: string;
  timestamp?: string;
  range: StringInterval;
  filledIntervals?: StringInterval[];
  inProgressIntervals?: StringInterval[];
  internalFields?: InternalFields;
  updatedAt?: string;
  failedAutoFillAttempts?: number;
}

export class Gap {
  private _range: Interval;
  private _filledIntervals: Interval[];
  private _inProgressIntervals: Interval[];
  private _internalFields?: InternalFields;
  private _timestamp?: string;
  private _updatedAt?: string;
  private _failedAutoFillAttempts?: number;
  readonly _ruleId: string;

  constructor({
    ruleId,
    timestamp,
    range,
    filledIntervals = [],
    inProgressIntervals = [],
    internalFields,
    updatedAt,
    failedAutoFillAttempts,
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

    this._updatedAt = updatedAt ?? new Date().toISOString();
    this._ruleId = ruleId;
    this._failedAutoFillAttempts = failedAutoFillAttempts ?? 0;
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

  public get updatedAt() {
    return this._updatedAt;
  }

  public setUpdatedAt(updatedAt: string): void {
    this._updatedAt = updatedAt;
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

  public incrementFailedAutoFillAttempts(): void {
    this._failedAutoFillAttempts = (this._failedAutoFillAttempts ?? 0) + 1;
  }

  public get failedAutoFillAttempts(): number {
    return this._failedAutoFillAttempts ?? 0;
  }

  public resetInProgressIntervals(): void {
    this._inProgressIntervals = [];
  }

  public get internalFields() {
    return this._internalFields;
  }

  public get ruleId() {
    return this._ruleId;
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
      updated_at: this._updatedAt,
      failed_auto_fill_attempts: this._failedAutoFillAttempts,
    };
  }
}
