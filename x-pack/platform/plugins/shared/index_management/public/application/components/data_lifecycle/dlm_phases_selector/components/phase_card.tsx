/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
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
  children?: React.ReactNode;
  onChange?: (checked: boolean) => void;
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
  children,
  onChange,
}: PhaseCardProps) => {
  const styles = usePhaseCardStyles();

  return (
    <EuiCheckableCard
      id={id}
      checkableType="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={checkboxAriaLabel}
      onChange={(event) => onChange?.(event.target.checked)}
      data-test-subj={dataTestSubj}
      label={
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
              <EuiFlexItem grow={false}>
                <EuiText size="s" css={styles.titleText}>
                  {title}
                </EuiText>
              </EuiFlexItem>
              {badges && <EuiFlexItem grow={false}>{badges}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="s">{description}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {checked && children && <>{children}</>}
    </EuiCheckableCard>
  );
};
