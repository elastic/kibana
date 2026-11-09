/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { DecisionUserAction } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

/** A proposal decided on the case; the row's author is the person who decided it. */
export const createDecisionUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<DecisionUserAction>;
    const { title, outcome } = action.payload.decision;
    return createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label: (
        <span data-test-subj={`decision-user-action-${outcome}`}>
          {outcome === 'approved' ? i18n.DECISION_APPROVED(title) : i18n.DECISION_DISMISSED(title)}
        </span>
      ),
      icon: outcome === 'approved' ? 'check' : 'cross',
    }).build();
  },
});
