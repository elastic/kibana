/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import * as i18n from '../translations';

interface Props {
  checked: boolean;
  onEnabledChange: (checked: boolean) => void;
}

export const EpisodeScopedQuerySwitch = (props: Props) => {
  const { checked, onEnabledChange } = props;

  const onEnabledChangeInternal = useCallback(
    (event: EuiSwitchEvent) => {
      onEnabledChange(event.target.checked);
    },
    [onEnabledChange]
  );

  return (
    <EuiFlexGroup data-test-subj="episodeScopedQuerySwitch" direction="column" gutterSize="s">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h4>{i18n.CREATE_FORM_ALERTINGV2_FILTERS_TITLE}</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            label={i18n.TECHNICAL_PREVIEW_LABEL}
            iconType="flask"
            tooltipContent={i18n.CREATE_FORM_ALERTINGV2_FILTERS_TECHNICAL_PREVIEW_TOOLTIP}
            size="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        <EuiText size="s">
          <p>
            <EuiTextColor color="subdued">
              {i18n.CREATE_FORM_ALERTINGV2_FILTERS_DESCRIPTION}
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSwitch
          label={i18n.CREATE_FORM_ALERTINGV2_FILTERS_TOGGLE_LABEL}
          checked={checked}
          onChange={onEnabledChangeInternal}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
