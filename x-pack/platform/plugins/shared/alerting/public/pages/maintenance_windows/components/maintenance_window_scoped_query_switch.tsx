/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiText,
  EuiFlexItem,
  EuiTextColor,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';

import * as i18n from '../translations';

interface MaintenanceWindowScopedQuerySwitchProps {
  checked: boolean;
  onEnabledChange: (checked: boolean) => void;
}

export const MaintenanceWindowScopedQuerySwitch = (
  props: MaintenanceWindowScopedQuerySwitchProps
) => {
  const { checked, onEnabledChange } = props;

  const onEnabledChangeInternal = useCallback(
    (event: EuiSwitchEvent) => {
      onEnabledChange(event.target.checked);
    },
    [onEnabledChange]
  );

  return (
    <EuiFlexGroup data-test-subj="maintenanceWindowScopedQuerySwitch" direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          <h4>{i18n.CREATE_FORM_SCOPED_QUERY_TITLE}</h4>
          <p>
            <EuiTextColor color="subdued">{i18n.CREATE_FORM_SCOPED_QUERY_DESCRIPTION}</EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSwitch
          label={i18n.CREATE_FORM_SCOPED_QUERY_TOGGLE_TITLE}
          checked={checked}
          onChange={onEnabledChangeInternal}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
