/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertSubject, type SubjectInput } from './subject';

/**
 * Builds the alert-scoped composite suppression key:
 * `${subject}:${group_hash}:${alert_id}`
 *
 * For internal alerts `subject = rule_id`; for external alerts
 * `subject = ${space_id}::${source}` (e.g. "default::pagerduty").
 */
export const suppressionAlertKey = (
  x: SubjectInput & { group_hash: string; alert_id: string }
): string => `${alertSubject(x)}:${x.group_hash}:${x.alert_id}`;

/**
 * Builds the series-scoped composite suppression key:
 * `${subject}:${group_hash}:*`
 *
 * Used to match series-level suppressions (null `alert_id`) against any
 * alert that belongs to the same series.
 */
export const suppressionSeriesKey = (x: SubjectInput & { group_hash: string }): string =>
  `${alertSubject(x)}:${x.group_hash}:*`;
