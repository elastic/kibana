/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

export const INVESTIGATIONS_INTERNAL_URL =
  `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/investigations` as const;

/** URL for the per-investigation assignment route. */
export const INVESTIGATION_ASSIGN_URL = `${INVESTIGATIONS_INTERNAL_URL}/{id}/assignees` as const;

export const INVESTIGATIONS_UI_CAPABILITY_SHOW = 'showInvestigations' as const;
export const INVESTIGATIONS_UI_CAPABILITY_MANAGE = 'manageInvestigations' as const;
