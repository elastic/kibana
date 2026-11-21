/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActivityOrigin } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import * as i18n from './translations';

const ACTION_ICONS: Record<string, string> = {
  'record.title_changed': ICONS.edit,
  'record.description_changed': ICONS.edit,
  'record.tags_changed': ICONS.edit,
  'record.fields_changed': ICONS.edit,
  'record.priority_changed': ICONS.priority,
  'record.status_changed': ICONS.status,
  'record.assignees_changed': ICONS.users,
  'record.type_changed': ICONS.template,
  'record.comment_added': ICONS.conversation,
  'record.comment_edited': ICONS.conversation,
  'record.comment_deleted': ICONS.conversation,
  'record.connector_changed': ICONS.link,
  'record.pushed': ICONS.external,
  'record.workflow_run': ICONS.automation,
  'task.workflow_run': ICONS.automation,
  'procedure.reordered': ICONS.procedure,
  'procedure.applied': ICONS.procedure,
};

const PREFIX_ICONS: Array<[string, string]> = [
  ['record.', ICONS.investigation],
  ['task.', ICONS.procedure],
  ['procedure.', ICONS.procedure],
  ['claim.', ICONS.claim],
  ['proposal', ICONS.proposal],
  ['evidence.', ICONS.evidence],
  ['entity.', ICONS.graphNode],
  ['link.', ICONS.link],
  ['thread.', ICONS.thread],
  ['item', ICONS.evidence],
];

/** The icon of an activity action, falling back to the family of the action and then a generic one. */
export const getActionIcon = (action: string): string =>
  ACTION_ICONS[action] ??
  PREFIX_ICONS.find(([prefix]) => action.startsWith(prefix))?.[1] ??
  ICONS.activity;

const ORIGIN_LABELS: Record<Exclude<ActivityOrigin, 'person'>, string> = {
  agent: i18n.ORIGIN_AGENT,
  workflow: i18n.ORIGIN_WORKFLOW,
  rule: i18n.ORIGIN_RULE,
  api: i18n.ORIGIN_API,
  connector: i18n.ORIGIN_CONNECTOR,
};

/** "via workflow" and so on; people have no label. */
export const getOriginLabel = (origin: ActivityOrigin | null | undefined): string | null =>
  origin && origin !== 'person' ? ORIGIN_LABELS[origin] : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stripFieldSuffix = (key: string): string =>
  key.replace(/_as_[a-z_]+$/, '').replace(/_/g, ' ');

/** Text for a before or after value: statuses show their label and pause reason, fields one line each. */
export const formatChange = (action: string, value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return value.join(', ');
  }
  if (action === 'record.status_changed' && isRecord(value)) {
    const label = typeof value.label === 'string' ? value.label : String(value.key ?? '');
    const reason = typeof value.pause_reason === 'string' ? value.pause_reason : null;
    return reason ? i18n.STATUS_WITH_PAUSE_REASON(label, reason) : label;
  }
  if (action === 'record.fields_changed' && isRecord(value)) {
    return Object.entries(value)
      .map(([key, entry]) => `${stripFieldSuffix(key)}: ${String(entry === '' ? '-' : entry)}`)
      .join('\n');
  }
  return JSON.stringify(value, null, 2) ?? '';
};
