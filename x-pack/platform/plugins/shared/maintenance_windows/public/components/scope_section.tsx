/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React from 'react';

export interface ScopeSectionProps {
  title: string;
  description: string;
  switchLabel: string;
  switchChecked: boolean;
  onSwitchChange: (checked: boolean) => void;
  switchDataTestSubj?: string;
  expandedSubtitle: string;
  titleBadge?: React.ReactNode;
  children: React.ReactNode;
}

export const ScopeSection = ({
  title,
  description,
  switchLabel,
  switchChecked,
  onSwitchChange,
  switchDataTestSubj,
  expandedSubtitle,
  titleBadge,
  children,
}: ScopeSectionProps) => (
  <EuiPanel hasBorder={true}>
    <EuiFlexGroup
      direction="row"
      responsive={false}
      justifyContent="spaceBetween"
      alignItems="center"
    >
      <EuiFlexGroup direction="column" responsive={false} gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h4>{title}</h4>
              </EuiText>
            </EuiFlexItem>
            {titleBadge ? <EuiFlexItem grow={false}>{titleBadge}</EuiFlexItem> : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>
              <EuiTextColor color="subdued">{description}</EuiTextColor>
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj={switchDataTestSubj}
          label={switchLabel}
          showLabel={false}
          checked={switchChecked}
          onChange={(event: EuiSwitchEvent) => onSwitchChange(event.target.checked)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    {switchChecked && (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiText size="s">
          <h4>{expandedSubtitle}</h4>
        </EuiText>
        <EuiSpacer size="s" />
        {children}
      </>
    )}
  </EuiPanel>
);
