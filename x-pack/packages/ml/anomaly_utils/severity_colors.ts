/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * RGB hex codes used to indicate the severity of an anomaly according to its anomaly score.
 */
export const ML_SEVERITY_COLORS = {
  /**
   * Color used in the UI to indicate a critical anomaly, with a score greater than or equal to 75.
   */
  CRITICAL: '#fe5050',

  /**
   * Color used in the UI to indicate a major anomaly, with a score greater than or equal to 50 and less than 75 .
   */
  MAJOR: '#fba740',

  /**
   * Color used in the UI to indicate a minor anomaly, with a score greater than or equal to 25 and less than 50.
   */
  MINOR: '#fdec25',

  /**
   * Color used in the UI to indicate a warning anomaly, with a score greater than or equal to 3 and less than 25.
   * Note in some parts of the UI, warning severity is used when the score is greater than or equal to 0.
   */
  WARNING: '#8bc8fb',

  /**
   * Color used in some parts of the UI to indicate a low severity anomaly, with a score greater than or equal to 0 and less than 3.
   */
  LOW: '#d2e9f7',

  /**
   * Color used in the UI to indicate an anomaly for which the score is unknown.
   */
  BLANK: '#ffffff',
};
