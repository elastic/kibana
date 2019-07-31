/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ANOMALY_SEVERITY } from '../constants/anomalies';

export function getSeverity(normalizedScore: number): string;
export function getSeverityType(normalizedScore: number): ANOMALY_SEVERITY;
export function getSeverityColor(normalizedScore: number): string;
