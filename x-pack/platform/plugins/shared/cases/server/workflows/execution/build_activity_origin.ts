/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import type { WorkflowOrigin } from '../../../common/types/domain/user_action/workflow/v1';

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const findEventEntity = (
  event: Record<string, unknown>,
  property: string,
  id: string
): Record<string, unknown> | undefined => {
  const entities = event[property];
  if (!Array.isArray(entities)) {
    return undefined;
  }

  return entities.map(getRecord).find((entity) => entity?._id === id || entity?.id === id);
};

export const buildActivityOrigin = (
  origin: CaseWorkflowRunOrigin,
  inputs: Record<string, unknown>
): WorkflowOrigin => {
  const event = getRecord(inputs.event);
  if (!event) {
    return origin;
  }

  if (origin.type === ALERT_WORKFLOW_ORIGIN_TYPE) {
    const alert =
      findEventEntity(event, 'alerts', origin.id) ?? findEventEntity(event, 'alertIds', origin.id);
    const index = alert?._index;
    return typeof index === 'string' ? { ...origin, index } : origin;
  }

  if (origin.type === OBSERVABLE_WORKFLOW_ORIGIN_TYPE) {
    const observable = findEventEntity(event, 'observables', origin.id);
    const typeKey = observable?.typeKey;
    const value = observable?.value;
    return typeof typeKey === 'string' && typeof value === 'string'
      ? { ...origin, typeKey, value }
      : origin;
  }

  return origin;
};
