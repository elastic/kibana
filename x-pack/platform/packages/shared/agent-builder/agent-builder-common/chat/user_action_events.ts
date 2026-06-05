/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { UserIdAndName } from '../base/users';
import type { BaseTimelineEvent } from './conversation';
import { TimelineEventType } from './conversation';

/** POC audit actions on `events[]` until B3 federates Cases UserActions. */
export enum UserActionType {
  field_changed = 'field_changed',
  attachment_added = 'attachment_added',
}

export interface FieldChangedUserActionPayload {
  field: string;
  previous_value: unknown;
  new_value: unknown;
}

export interface AttachmentAddedUserActionPayload {
  attachment_id: string;
  attachment_type: string;
  description?: string;
}

export interface UserActionEvent extends BaseTimelineEvent<'user_action'> {
  user: UserIdAndName;
  action: UserActionType;
  payload: FieldChangedUserActionPayload | AttachmentAddedUserActionPayload;
}

const valuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const isScalarAuditValue = (
  value: unknown
): value is string | number | boolean | null | undefined =>
  value === null ||
  value === undefined ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

/** ES maps audit payload values as text — objects/arrays must be JSON strings. */
export const serializeAuditValue = (value: unknown): unknown => {
  if (isScalarAuditValue(value)) {
    return value ?? null;
  }

  return JSON.stringify(value);
};

export const deserializeAuditValue = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
};

export const createFieldChangedUserActionEvents = ({
  previousFields,
  nextFields,
  user,
  timestamp = new Date().toISOString(),
}: {
  previousFields: Record<string, unknown>;
  nextFields: Record<string, unknown>;
  user: UserIdAndName;
  timestamp?: string;
}): UserActionEvent[] => {
  const keys = new Set([...Object.keys(previousFields), ...Object.keys(nextFields)]);
  const events: UserActionEvent[] = [];

  for (const field of keys) {
    const previous_value = previousFields[field];
    const new_value = nextFields[field];

    if (valuesEqual(previous_value, new_value)) {
      continue;
    }

    events.push({
      id: uuidv4(),
      timestamp,
      type: TimelineEventType.user_action,
      user,
      action: UserActionType.field_changed,
      payload: {
        field,
        previous_value: serializeAuditValue(previous_value),
        new_value: serializeAuditValue(new_value),
      },
    });
  }

  return events;
};

export const createAttachmentAddedUserActionEvent = ({
  attachmentId,
  attachmentType,
  description,
  user,
  timestamp = new Date().toISOString(),
}: {
  attachmentId: string;
  attachmentType: string;
  description?: string;
  user: UserIdAndName;
  timestamp?: string;
}): UserActionEvent => ({
  id: uuidv4(),
  timestamp,
  type: TimelineEventType.user_action,
  user,
  action: UserActionType.attachment_added,
  payload: {
    attachment_id: attachmentId,
    attachment_type: attachmentType,
    ...(description !== undefined ? { description } : {}),
  },
});
