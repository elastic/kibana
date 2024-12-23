/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText, EuiTextAlign } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';

const NoSelectedAssigneesComponent: React.FC<{ totalSelectedCases: number }> = ({
  totalSelectedCases,
}) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      direction="column"
      justifyContent="spaceAround"
      data-test-subj="case-user-profiles-assignees-no-selected-assignees"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="userAvatar" size="xl" />
        <EuiSpacer size="xs" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTextAlign textAlign="center">
          <EuiText size="s" color="default">
            <strong>{i18n.NO_SELECTED_ASSIGNEES(totalSelectedCases)}</strong>
            <br />
          </EuiText>
          <EuiText size="s" color="subdued">
            {i18n.NO_SELECTED_ASSIGNEES_HELP_TEXT}
          </EuiText>
        </EuiTextAlign>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

NoSelectedAssigneesComponent.displayName = 'NoSelectedAssignees';

export const NoSelectedAssignees = React.memo(NoSelectedAssigneesComponent);
