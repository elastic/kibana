/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseTaskPriority } from '../../../common/types/domain/task/v1';
import { severities } from '../severity/config';

/** Task priorities share the case severity scale and its labels. */
export const PRIORITY_OPTIONS = (Object.keys(severities) as CaseTaskPriority[]).map((value) => ({
  value,
  label: severities[value].label,
}));
