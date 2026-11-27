/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { getEbtProps } from '@kbn/ebt-click';
import type { ReactNode } from 'react';
import React from 'react';

interface ConnectorCardLabelProps {
  icon: ReactNode;
  name: string;
  typeLabel: string;
}

const ConnectorCardLabel = ({ icon, name, typeLabel }: ConnectorCardLabelProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
    <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
    <EuiFlexItem css={{ minWidth: 0 }}>
      <EuiTitle size="xs">
        <span className="eui-textTruncate">{name}</span>
      </EuiTitle>
      <EuiText size="s" color="subdued" className="eui-textTruncate">
        {typeLabel}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface SelectableConnectorCardProps extends ConnectorCardLabelProps {
  id: string;
  isChecked: boolean;
  isDisabled?: boolean;
  onChange: (checked: boolean) => void;
  checkboxProps?: ReturnType<typeof getEbtProps>;
  'data-test-subj'?: string;
}

export const SelectableConnectorCard = ({
  id,
  icon,
  name,
  typeLabel,
  isChecked,
  isDisabled = false,
  onChange,
  checkboxProps,
  'data-test-subj': dataTestSubj,
}: SelectableConnectorCardProps) => (
  <EuiCheckableCard
    hasBorder
    checkableType="checkbox"
    id={id}
    label={<ConnectorCardLabel icon={icon} name={name} typeLabel={typeLabel} />}
    checked={isChecked}
    disabled={isDisabled}
    onChange={(event) => onChange(event.target.checked)}
    data-test-subj={dataTestSubj}
    {...checkboxProps}
  />
);

interface RemovableConnectorCardProps extends ConnectorCardLabelProps {
  action?: ReactNode;
  'data-test-subj'?: string;
}

export const RemovableConnectorCard = ({
  icon,
  name,
  typeLabel,
  action,
  'data-test-subj': dataTestSubj,
}: RemovableConnectorCardProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <ConnectorCardLabel icon={icon} name={name} typeLabel={typeLabel} />
      </EuiFlexItem>
      {action ? <EuiFlexItem grow={false}>{action}</EuiFlexItem> : null}
    </EuiFlexGroup>
  </EuiPanel>
);
