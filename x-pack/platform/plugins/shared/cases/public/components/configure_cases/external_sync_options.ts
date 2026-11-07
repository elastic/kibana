/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExternalSyncConflictStrategy,
  ExternalSyncDirection,
  ExternalSyncField,
} from '../../../common/types/domain';
import { EXTERNAL_SYNC_FIELDS } from '../../../common/utils/external_sync_fields';
import * as userActionsI18n from '../user_actions/translations';
import * as i18n from './translations';

export const EXTERNAL_SYNC_FIELD_LABELS: Record<ExternalSyncField, string> = {
  title: userActionsI18n.TITLE,
  description: userActionsI18n.DESCRIPTION,
  status: userActionsI18n.STATUS,
  tags: userActionsI18n.TAGS,
  comments: userActionsI18n.COMMENTS,
};

/** The label of a built-in sync field; any other field name is returned as is. */
export const getExternalSyncFieldLabel = (field: string): string => {
  const syncField = EXTERNAL_SYNC_FIELDS.find((candidate) => candidate === field);
  return syncField != null ? EXTERNAL_SYNC_FIELD_LABELS[syncField] : field;
};

const DIRECTION_LABELS: Record<ExternalSyncDirection, string> = {
  both: i18n.FIELD_SYNC_DIRECTION_BOTH,
  push: i18n.FIELD_SYNC_DIRECTION_PUSH,
  pull: i18n.FIELD_SYNC_DIRECTION_PULL,
  off: i18n.FIELD_SYNC_DIRECTION_OFF,
};

export const toDirectionOptions = (
  directions: readonly ExternalSyncDirection[]
): Array<{ value: ExternalSyncDirection; text: string }> =>
  directions.map((value) => ({ value, text: DIRECTION_LABELS[value] }));

/** Select value for a field that inherits the connector's conflict strategy. */
export const USE_DEFAULT_CONFLICT = 'default';

export const FIELD_CONFLICT_OPTIONS = [
  { value: USE_DEFAULT_CONFLICT, text: i18n.FIELD_SYNC_CONFLICT_DEFAULT },
  { value: 'kibana', text: i18n.CONFLICT_KEEP_KIBANA },
  { value: 'external', text: i18n.CONFLICT_KEEP_EXTERNAL },
];

export const toConflictStrategy = (value: string): ExternalSyncConflictStrategy | undefined =>
  value === 'kibana' || value === 'external' ? value : undefined;
