/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';

/**
 * Represents the minimum and maximum time bounds for a time range.
 */
export interface TimeRangeBounds {
  /**
   * The minimum bound of the time range (optional).
   */
  min?: Moment;
  /**
   * The maximum bound of the time range (optional).
   */
  max?: Moment;
}

/**
 * Defines the structure for time intervals used within TimeBuckets.
 */
export declare interface TimeBucketsInterval {
  /**
   * Returns the interval in milliseconds.
   */
  asMilliseconds: () => number;
  /**
   * Returns the interval in seconds.
   */
  asSeconds: () => number;
  /**
   * The string expression representing the interval.
   */
  expression: string;
}

/**
 * Configuration options for initializing TimeBuckets.
 */
export interface TimeBucketsConfig {
  /**
   * The maximum number of bars to display on the histogram.
   */
  'histogram:maxBars': number;
  /**
   * The targeted number of bars for the histogram.
   */
  'histogram:barTarget': number;
  /**
   * The date format string.
   */
  dateFormat: string;
  /**
   * The scaled date format strings.
   */
  'dateFormat:scaled': string[][];
}

/**
 * Represents a configurable utility class for working with time buckets.
 */
export declare class TimeBuckets {
  /**
   * Creates an instance of TimeBuckets.
   * @param timeBucketsConfig - Configuration for the TimeBuckets instance.
   */
  constructor(timeBucketsConfig: TimeBucketsConfig);

  /**
   * Sets the target number of bars for the histogram.
   * @param barTarget - The target bar count.
   */
  public setBarTarget(barTarget: number): void;

  /**
   * Sets the maximum number of bars for the histogram.
   * @param maxBars - The maximum bar count.
   */
  public setMaxBars(maxBars: number): void;

  /**
   * Sets the interval for the time buckets.
   * @param interval - The interval expression, e.g., "1h" for one hour.
   */
  public setInterval(interval: string): void;

  /**
   * Sets the bounds of the time range for the buckets.
   * @param bounds - The minimum and maximum time bounds.
   */
  public setBounds(bounds: TimeRangeBounds): void;

  /**
   * Gets the current bounds of the time range.
   * @returns The current time range bounds.
   */
  public getBounds(): { min: Moment; max: Moment };

  /**
   * Retrieves the configured interval for the buckets.
   * @returns The current interval settings for the buckets.
   */
  public getInterval(): TimeBucketsInterval;

  /**
   * Calculates the nearest interval that is a multiple of a specified divisor.
   * @param divisorSecs - The divisor in seconds.
   * @returns The nearest interval as a multiple of the divisor.
   */
  public getIntervalToNearestMultiple(divisorSecs: number): TimeBucketsInterval;

  /**
   * Retrieves the date format that should be used for scaled intervals.
   * @returns The scaled date format string.
   */
  public getScaledDateFormat(): string;
}

/**
 * Adjusts the given time range bounds to align with the specified interval.
 * @param bounds The current time range bounds.
 * @param interval The interval to align the time range bounds with.
 * @param inclusiveEnd Whether the end of the range should be inclusive.
 * @returns The adjusted time range bounds.
 */
export declare function getBoundsRoundedToInterval(
  bounds: TimeRangeBounds,
  interval: TimeBucketsInterval,
  inclusiveEnd?: boolean
): Required<TimeRangeBounds>;
