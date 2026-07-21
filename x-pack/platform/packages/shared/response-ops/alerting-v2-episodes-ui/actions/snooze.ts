/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { ALERT_EPISODE_ACTION_TYPE, type SnoozeCondition } from '@kbn/alerting-v2-schemas';
import {
  DataConditionType,
  type SnoozeCondition as SnoozeConditionUiEntry,
} from '@kbn/response-ops-alert-snooze';
import type { EpisodeAction, EpisodeActionContext } from './types';
import { bulkCreateAlertActions } from './bulk_create_alert_actions';
import { uniqueByGroup, successOrPartialToast } from './helpers';
import * as i18n from './translations';
import { openSnoozeExpiryModal } from '../components/snooze_expiry_modal';
import { getEpisodeDataFieldOptions } from '../utils/episode_data_field_options';

export interface SnoozeActionDeps {
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  rendering: CoreStart['rendering'];
}

const DATA_FIELD_PREFIX = 'data.';

/** Episode data fields live under the `data.` namespace in the snooze conditions API. */
const toDataFieldPath = (field: string): string =>
  field.startsWith(DATA_FIELD_PREFIX) ? field : `${DATA_FIELD_PREFIX}${field}`;

/**
 * Maps a condition emitted by the shared `@kbn/response-ops-alert-snooze` panel (Alerting V1's
 * `type`-discriminated shape) to the V2 API's `field`/`operator`(/`value`) shape.
 */
export const toApiSnoozeCondition = (
  condition: SnoozeConditionUiEntry
): SnoozeCondition | undefined => {
  switch (condition.type) {
    case DataConditionType.SEVERITY_EQUALS:
      // The shared panel types severities as V1's wider set; values outside the V2 set are
      // rejected by the API schema.
      return {
        field: 'severity',
        operator: 'eq',
        value: condition.value as Extract<SnoozeCondition, { operator: 'eq' }>['value'],
      };
    case DataConditionType.SEVERITY_CHANGE:
      return { field: 'severity', operator: 'changed' };
    case DataConditionType.FIELD_CHANGE:
      // `typeof` guard because the UI union's catch-all arm keeps `field` from narrowing to string.
      return typeof condition.field === 'string'
        ? { field: toDataFieldPath(condition.field), operator: 'changed' }
        : undefined;
    default:
      return undefined;
  }
};

export const createSnoozeAction = (deps: SnoozeActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_SNOOZE_EPISODE',
  order: 20,
  displayName: i18n.SNOOZE,
  iconType: 'bellSlash',
  isCompatible: ({ episodes }: EpisodeActionContext) =>
    episodes.length > 0 && episodes.some((ep) => ep.last_snooze_action !== 'snooze'),
  execute: async ({ episodes, onSuccess }: EpisodeActionContext) => {
    const schedule = await openSnoozeExpiryModal(
      deps.overlays,
      deps.rendering,
      getEpisodeDataFieldOptions(episodes)
    );
    if (schedule === undefined) return;

    const { expiresAt, conditions, conditionOperator } = schedule;
    const apiConditions = (conditions ?? [])
      .map(toApiSnoozeCondition)
      .filter((condition): condition is SnoozeCondition => condition !== undefined);
    const items = uniqueByGroup(episodes).map((ep) => ({
      group_hash: ep.group_hash,
      action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
      ...(expiresAt ? { expiry: expiresAt } : {}),
      ...(apiConditions.length > 0 ? { conditions: apiConditions } : {}),
      ...(conditionOperator ? { match: conditionOperator } : {}),
    }));
    if (!items.length) return;

    try {
      const { processed, total } = await bulkCreateAlertActions(deps.http, items as any);
      deps.notifications.toasts.add(successOrPartialToast(processed, total));
      onSuccess?.();
    } catch {
      deps.notifications.toasts.addDanger(i18n.BULK_ERROR_TOAST);
    }
  },
});
