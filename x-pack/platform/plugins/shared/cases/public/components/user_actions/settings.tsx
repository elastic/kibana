/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { SettingsUserAction } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';

import { createCommonUpdateUserActionBuilder } from './common';
import {
  DISABLED_SETTING,
  ENABLED_SETTING,
  SYNC_ALERTS_LC,
  EXTRACT_OBSERVABLES_LC,
} from './translations';

const SETTING_CONFIGS = [
  {
    key: 'syncAlerts' as const,
    enabledLabel: `${ENABLED_SETTING} ${SYNC_ALERTS_LC}`,
    disabledLabel: `${DISABLED_SETTING} ${SYNC_ALERTS_LC}`,
  },
  {
    key: 'extractObservables' as const,
    enabledLabel: `${ENABLED_SETTING} ${EXTRACT_OBSERVABLES_LC}`,
    disabledLabel: `${DISABLED_SETTING} ${EXTRACT_OBSERVABLES_LC}`,
  },
] as const;

function getSettingsLabel(userAction: SnakeToCamelCase<SettingsUserAction>): ReactNode {
  const settings = userAction.payload.settings;
  const labels = SETTING_CONFIGS.filter((config) => settings[config.key] !== undefined).map(
    (config) => (settings[config.key] ? config.enabledLabel : config.disabledLabel)
  );

  // Join labels if multiple, or return single label
  return labels.length > 1 ? labels.join(', ') : labels[0] || '';
}

export const createSettingsUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<SettingsUserAction>;
    const { syncAlerts, extractObservables } = action?.payload?.settings;
    if (syncAlerts !== undefined || extractObservables !== undefined) {
      const commonBuilder = createCommonUpdateUserActionBuilder({
        userProfiles,
        userAction,
        handleOutlineComment,
        label: getSettingsLabel(action),
        icon: 'gear',
      });

      return commonBuilder.build();
    }

    // if new settings are introduced. they won't be rendered
    return [];
  },
});
