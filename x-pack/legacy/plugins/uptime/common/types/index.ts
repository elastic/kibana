/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** Represents a bucket of monitor status information. */
export interface StatusData {
  /** The timeseries point for this status data. */
  x: number;
  /** The value of up counts for this point. */
  up?: number | null;
  /** The value for down counts for this point. */
  down?: number | null;
  /** The total down counts for this point. */
  total?: number | null;
}

/** Represents the average monitor duration ms at a point in time. */
export interface MonitorDurationAveragePoint {
  /** The timeseries value for this point. */
  x: number;
  /** The average duration ms for the monitor. */
  y?: number | null;
}

export interface LocationDurationLine {
  name: string;

  line: MonitorDurationAveragePoint[];
}

/** The data used to populate the monitor charts. */
export interface MonitorDurationResult {
  /** The average values for the monitor duration. */
  locationDurationLines: LocationDurationLine[];
}

export interface MonitorIdParam {
  monitorId: string;
}
