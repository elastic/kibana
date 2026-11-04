/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';

export type EntityAlertBadgeColor = 'danger' | 'success' | 'hollow';

export interface EntityAlertBadgePresentation {
  readonly color: EntityAlertBadgeColor;
  readonly tooltip: string;
}

export const entityAlertBadgePresentation = (
  entity: Entity | undefined
): EntityAlertBadgePresentation => {
  if (!entity) {
    return {
      color: 'hollow',
      tooltip: i18n.translate(
        'xpack.streams.entityCentricLab.entities.alertBadge.unknownEntity',
        { defaultMessage: 'Resource not found in inventory' }
      ),
    };
  }
  if (!entity.alerts) {
    return {
      color: 'hollow',
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
      tooltip: i18n.translate(
        'xpack.streams.entityCentricLab.entities.alertBadge.active',
        {
          defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}',
          values: { count: active },
        }
      ),
    };
  }
  return {
    color: 'success',
    tooltip: i18n.translate(
      'xpack.streams.entityCentricLab.entities.alertBadge.clear',
      { defaultMessage: '0 active alerts' }
    ),
  };
};
