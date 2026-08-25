/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';

import type { UserActionUI } from '../../containers/types';
import { useCasesContext } from '../cases_context/use_cases_context';

interface Props {
  userAction: UserActionUI;
}

/**
 * Renders solution-owned extra actions for an activity row by invoking the
 * `renderUserActionExtraActions` prop from CasesContext, if one was provided.
 * Reads context directly so no threading through UserActionBuilderArgs is required.
 */
export const UserActionExtraActions = React.memo<Props>(({ userAction }) => {
  const { renderUserActionExtraActions } = useCasesContext();
  const node = renderUserActionExtraActions?.({ userAction });
  return node ? <EuiFlexItem grow={false}>{node}</EuiFlexItem> : null;
});

UserActionExtraActions.displayName = 'UserActionExtraActions';
