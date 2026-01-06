/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiText } from '@elastic/eui';
import type { SnakeToCamelCase } from '../../../common/types';
import type { ObservablesUserAction } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';

import { createCommonUpdateUserActionBuilder } from './common';
import { ADDED_OBSERVABLES, DELETED_OBSERVABLES, UPDATED_OBSERVABLES } from './translations';
import type { ObservablesActionType } from '../../../common/types/domain/user_action/observables/v1';

const getLabel: (actionType: ObservablesActionType, count: number) => ReactNode = (
  actionType,
  count
) => {
  let label = '';
  switch (actionType) {
    case 'add':
      label = ADDED_OBSERVABLES(count);
      break;
    case 'delete':
      label = DELETED_OBSERVABLES(count);
      break;
    case 'update':
      label = UPDATED_OBSERVABLES(count);
      break;
  }
  return (
    <EuiText size="s" data-test-subj={`observables-${actionType}-action`}>
      {label}
    </EuiText>
  );
};
export const createObservablesUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<ObservablesUserAction>;
    const { count, actionType } = action?.payload?.observables;
    const label = getLabel(actionType, count);

    if (count > 0) {
      const commonBuilder = createCommonUpdateUserActionBuilder({
        userProfiles,
        userAction,
        handleOutlineComment,
        label,
        icon: 'dot',
      });

      return commonBuilder.build();
    }
    return [];
  },
});
