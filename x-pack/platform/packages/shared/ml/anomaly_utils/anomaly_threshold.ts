/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Anomaly score numeric thresholds to indicate the severity of the anomaly.
 */
export enum ML_ANOMALY_THRESHOLD {
  /**
   * Threshold at which anomalies are labelled in the UI as critical.
   */
  CRITICAL = 75,

  /**
   * Threshold at which anomalies are labelled in the UI as major.
   */
  MAJOR = 50,

  /**
   * Threshold at which anomalies are labelled in the UI as minor.
   */
  MINOR = 25,

  /**
   * Threshold at which anomalies are labelled in the UI as warning.
   */
  WARNING = 3,

  /**
   * Threshold at which anomalies are labelled in the UI as low.
   */
  LOW = 0,
}
