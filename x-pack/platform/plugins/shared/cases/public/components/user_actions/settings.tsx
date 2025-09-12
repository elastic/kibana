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

// TODO: Separate into 2 user actions, https://github.com/elastic/security-team/issues/13709
function getSettingsLabel(userAction: SnakeToCamelCase<SettingsUserAction>): ReactNode {
  let label = '';

  if (userAction.payload.settings.syncAlerts) {
    label = `${ENABLED_SETTING} ${SYNC_ALERTS_LC}`;
  } else {
    label = `${DISABLED_SETTING} ${SYNC_ALERTS_LC}`;
  }

  if (userAction.payload.settings.extractObservables) {
    label = `${label} and ${ENABLED_SETTING} ${EXTRACT_OBSERVABLES_LC}`;
  } else {
    label = `${label} and ${DISABLED_SETTING} ${EXTRACT_OBSERVABLES_LC}`;
  }
  return label;
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
