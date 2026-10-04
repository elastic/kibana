/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';
import type { ParseIncident } from '../types';
import { asString } from '../utils';

// Incident (ITSM) states: New, In Progress, On Hold, Resolved, Closed, Canceled.
const ITSM_STATUS_BY_STATE: Record<string, CaseStatuses> = {
  '1': CaseStatuses.open,
  '2': CaseStatuses['in-progress'],
  '3': CaseStatuses['in-progress'],
  '6': CaseStatuses.closed,
  '7': CaseStatuses.closed,
  '8': CaseStatuses.closed,
};

// Security Incident (SIR) states: Draft, Analysis, Contain, Eradicate, Recover, Review, Closed, Cancelled.
const SIR_STATUS_BY_STATE: Record<string, CaseStatuses> = {
  '1': CaseStatuses.open,
  '10': CaseStatuses['in-progress'],
  '16': CaseStatuses['in-progress'],
  '18': CaseStatuses['in-progress'],
  '19': CaseStatuses['in-progress'],
  '100': CaseStatuses['in-progress'],
  '3': CaseStatuses.closed,
  '7': CaseStatuses.closed,
};

const parseWith =
  (statusByState: Record<string, CaseStatuses>): ParseIncident =>
  (incident) => ({
    title: asString(incident.short_description),
    description: asString(incident.description),
    status: statusByState[asString(incident.state) ?? ''],
    updatedAt: asString(incident.sys_updated_on),
    updatedBy: asString(incident.sys_updated_by),
  });

export const parseItsmIncident = parseWith(ITSM_STATUS_BY_STATE);
export const parseSirIncident = parseWith(SIR_STATUS_BY_STATE);
