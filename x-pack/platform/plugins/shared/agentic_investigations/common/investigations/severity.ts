/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVESTIGATION_SEVERITIES } from './constants';
import type { InvestigationSeverity } from './investigation';

/** Whether a metadata value is one of the investigation severities. */
export const isInvestigationSeverity = (value: unknown): value is InvestigationSeverity =>
  INVESTIGATION_SEVERITIES.some((severity) => severity === value);
