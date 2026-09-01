/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { usePhaseCardStyles } from './styles';

export interface PhaseCardProps {
  id: string;
  checked: boolean;
  dataTestSubj: string;
  disabled?: boolean;
  checkboxAriaLabel: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  badges?: React.ReactNode;
  preserveBadgeColors?: boolean;
  children?: React.ReactNode;
  onChange?: (checked: boolean) => void;
  showCheckbox?: boolean;
}

export const PhaseCard = ({
  id,
  checked,
  dataTestSubj,
  disabled = false,
  checkboxAriaLabel,
  title,
  description,
  icon,
  badges,
  preserveBadgeColors = false,
  children,
  onChange,
  showCheckbox = true,
}: PhaseCardProps) => {
  const styles = usePhaseCardStyles();

  const disabledTextStyle = disabled ? styles.disabledText : undefined;
  const disabledBadgeTextStyle =
    disabled && !preserveBadgeColors ? styles.disabledBadgeText : undefined;

  const headerContent = (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
          <EuiFlexItem grow={false} css={styles.titleItem}>
            <EuiText size="s" css={[styles.titleText, disabledTextStyle]}>
              {title}
            </EuiText>
          </EuiFlexItem>
          {badges && (
            <EuiFlexItem grow={false} css={disabledBadgeTextStyle}>
              {badges}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="xs" css={disabledTextStyle}>
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (!showCheckbox) {
    return (
      <EuiPanel
        id={id}
        paddingSize="m"
        hasBorder
        data-test-subj={dataTestSubj}
        role="group"
        aria-label={title}
      >
        {headerContent}
        {checked && children && <>{children}</>}
      </EuiPanel>
    );
  }

  return (
    <EuiCheckableCard
      id={id}
      checkableType="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={checkboxAriaLabel}
      onChange={(event) => onChange?.(event.target.checked)}
      data-test-subj={dataTestSubj}
      label={headerContent}
    >
      {checked && children && <>{children}</>}
    </EuiCheckableCard>
  );
};
