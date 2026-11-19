/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';

type AlertBadgeEntity = {
  alerts?: { active: number; inMaintenance?: number };
};

export type EntityAlertBadgeColor = 'danger' | 'success' | 'hollow';

export interface EntityAlertBadgePresentation {
  readonly color: EntityAlertBadgeColor;
  readonly tooltip: string;
  /** Active alerts inside a maintenance window. `0` when none. */
  readonly inMaintenance: number;
}

export const entityInMaintenanceCount = (
  entity: { alerts?: { active: number; inMaintenance?: number } } | undefined
): number => {
  const active = entity?.alerts?.active ?? 0;
  const inMaintenance = entity?.alerts?.inMaintenance ?? 0;
  if (active <= 0 || inMaintenance <= 0) return 0;
  return Math.min(inMaintenance, active);
};

export const countEntitiesWithMaintenance = (
  entities: readonly { alerts?: { active: number; inMaintenance?: number } }[]
): number => entities.filter((entity) => entityInMaintenanceCount(entity) > 0).length;

/** Sum of active alerts across entities. Matches the row badges ("3 active alerts"). */
export const sumActiveAlerts = (
  entities: readonly { alerts?: { active: number } }[]
): number => entities.reduce((sum, entity) => sum + (entity.alerts?.active ?? 0), 0);

/** Sum of active alerts that sit inside a maintenance window. */
export const sumAlertsInMaintenance = (
  entities: readonly { alerts?: { active: number; inMaintenance?: number } }[]
): number => entities.reduce((sum, entity) => sum + entityInMaintenanceCount(entity), 0);

/** Sentence appended to a group/nav count when some of those entities are in a maintenance window. */
export const maintenanceEntitiesSentence = (maintenanceEntities: number): string | undefined => {
  if (maintenanceEntities <= 0) return undefined;
  return i18n.translate(
    'xpack.streams.entityCentricLab.entities.alertBadge.maintenanceEntities',
    {
      defaultMessage:
        '{count, plural, one {# of them has alerts in a maintenance window} other {# of them have alerts in a maintenance window}}. Notifications and actions for those are paused.',
      values: { count: maintenanceEntities },
    }
  );
};

export const withMaintenanceEntitiesSentence = (
  base: string,
  maintenanceEntities: number
): string => {
  const extra = maintenanceEntitiesSentence(maintenanceEntities);
  return extra ? `${base} ${extra}` : base;
};

export const activeAlertsTooltip = (active: number, inMaintenance: number): string => {
  const muted = Math.min(Math.max(inMaintenance, 0), active);
  if (muted <= 0) {
    return i18n.translate('xpack.streams.entityCentricLab.entities.alertBadge.active', {
      defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}',
      values: { count: active },
    });
  }
  if (muted >= active) {
    return i18n.translate(
      'xpack.streams.entityCentricLab.entities.alertBadge.activeAllMaintenance',
      {
        defaultMessage:
          '{count, plural, one {# active alert} other {# active alerts}}. All in a maintenance window. Notifications and actions for those are paused.',
        values: { count: active },
      }
    );
  }
  return i18n.translate('xpack.streams.entityCentricLab.entities.alertBadge.activeSomeMaintenance', {
    defaultMessage:
      '{count, plural, one {# active alert} other {# active alerts}}. {muted} in a maintenance window. Notifications and actions for those are paused.',
    values: { count: active, muted },
  });
};

export const entityAlertBadgePresentation = (
  entity: AlertBadgeEntity | Entity | undefined
): EntityAlertBadgePresentation => {
  if (!entity) {
    return {
      color: 'hollow',
      inMaintenance: 0,
      tooltip: i18n.translate(
        'xpack.streams.entityCentricLab.entities.alertBadge.unknownEntity',
        { defaultMessage: 'Resource not found in inventory' }
      ),
    };
  }
  if (!entity.alerts) {
    return {
      color: 'hollow',
      inMaintenance: 0,
      tooltip: i18n.translate(
        'xpack.streams.entityCentricLab.entities.alertBadge.noSetup',
        { defaultMessage: 'No alert set up' }
      ),
    };
  }
  const { active } = entity.alerts;
  if (active > 0) {
    return {
      color: 'danger',
      // Maintenance is shown only in the flyout alerts table, not on inventory badges.
      inMaintenance: 0,
      tooltip: i18n.translate('xpack.streams.entityCentricLab.entities.alertBadge.active', {
        defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}',
        values: { count: active },
      }),
    };
  }
  return {
    color: 'success',
    inMaintenance: 0,
    tooltip: i18n.translate(
      'xpack.streams.entityCentricLab.entities.alertBadge.clear',
      { defaultMessage: '0 active alerts' }
    ),
  };
};
