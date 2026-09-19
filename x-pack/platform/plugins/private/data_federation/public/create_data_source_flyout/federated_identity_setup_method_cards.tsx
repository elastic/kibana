/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiIcon,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

export type FederatedIdentitySetupMethod = 'cloudformation' | 'manual';

export interface FederatedIdentitySetupMethodOption {
  id: FederatedIdentitySetupMethod;
  label: string;
  icon: EuiIconType;
}

const legendLabel = () =>
  i18n.translate('xpack.dataFederation.createFlyout.federated.setupMethod.legend', {
    defaultMessage: 'Federated identity setup method',
  });

export function FederatedIdentitySetupMethodCards({
  options,
  selectedMethod,
  onMethodChange,
  testSubjPrefix,
}: {
  options: FederatedIdentitySetupMethodOption[];
  selectedMethod: FederatedIdentitySetupMethod;
  onMethodChange: (method: FederatedIdentitySetupMethod) => void;
  testSubjPrefix: string;
}) {
  const groupName = useGeneratedHtmlId({ prefix: 'federatedIdentitySetupMethod' });

  return (
    <EuiFormFieldset legend={{ children: legendLabel(), display: 'hidden' }}>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        {options.map((option) => (
          <EuiFlexItem key={option.id}>
            <SetupMethodCard
              groupName={groupName}
              option={option}
              isSelected={selectedMethod === option.id}
              onSelect={() => onMethodChange(option.id)}
              testSubjPrefix={testSubjPrefix}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFormFieldset>
  );
}

function SetupMethodCard({
  groupName,
  option,
  isSelected,
  onSelect,
  testSubjPrefix,
}: {
  groupName: string;
  option: FederatedIdentitySetupMethodOption;
  isSelected: boolean;
  onSelect: () => void;
  testSubjPrefix: string;
}) {
  const cardId = useGeneratedHtmlId({ prefix: `federatedIdentitySetupMethod-${option.id}` });

  return (
    <EuiCheckableCard
      id={cardId}
      name={groupName}
      checked={isSelected}
      onChange={onSelect}
      data-test-subj={`${testSubjPrefix}SetupMethod-${option.id}`}
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={option.icon} size="m" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{option.label}</EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
}
