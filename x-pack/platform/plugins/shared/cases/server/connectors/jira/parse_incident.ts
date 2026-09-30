/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';
import type { ParseIncident } from '../types';
import { asString } from '../utils';

// Jira status category keys are fixed across workflows; individual status names are not.
const STATUS_BY_CATEGORY: Record<string, CaseStatuses> = {
  new: CaseStatuses.open,
  indeterminate: CaseStatuses['in-progress'],
  done: CaseStatuses.closed,
};

export const parseIncident: ParseIncident = (incident) => {
  const status = incident.status as { statusCategory?: { key?: unknown } } | undefined;

  return {
    title: asString(incident.summary),
    description: asString(incident.description),
    status: STATUS_BY_CATEGORY[asString(status?.statusCategory?.key) ?? ''],
    updatedAt: asString(incident.updated),
  };
};
