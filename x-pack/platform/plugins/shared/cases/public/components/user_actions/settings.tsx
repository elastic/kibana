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
  AUTO_PUSH_LC,
} from './translations';

type SettingsPayload = SnakeToCamelCase<SettingsUserAction>['payload']['settings'];

const SETTING_CONFIGS: Array<{
  getValue: (settings: SettingsPayload) => boolean | undefined;
  enabledLabel: string;
  disabledLabel: string;
}> = [
  {
    getValue: (settings) => settings.syncAlerts,
    enabledLabel: `${ENABLED_SETTING} ${SYNC_ALERTS_LC}`,
    disabledLabel: `${DISABLED_SETTING} ${SYNC_ALERTS_LC}`,
  },
  {
    getValue: (settings) => settings.extractObservables,
    enabledLabel: `${ENABLED_SETTING} ${EXTRACT_OBSERVABLES_LC}`,
    disabledLabel: `${DISABLED_SETTING} ${EXTRACT_OBSERVABLES_LC}`,
  },
  {
    getValue: (settings) => settings.externalSync?.autoPush,
    enabledLabel: `${ENABLED_SETTING} ${AUTO_PUSH_LC}`,
    disabledLabel: `${DISABLED_SETTING} ${AUTO_PUSH_LC}`,
  },
];

function getSettingsLabels(settings: SettingsPayload): ReactNode[] {
  return SETTING_CONFIGS.filter((config) => config.getValue(settings) !== undefined).map((config) =>
    config.getValue(settings) ? config.enabledLabel : config.disabledLabel
  );
}

export const createSettingsUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<SettingsUserAction>;
    const labels = getSettingsLabels(action?.payload?.settings ?? {});

    // Settings this renderer does not know about produce no timeline entry.
    if (labels.length === 0) {
      return [];
    }

    const commonBuilder = createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label: labels.join(', '),
      icon: 'gear',
    });

    return commonBuilder.build();
  },
});
