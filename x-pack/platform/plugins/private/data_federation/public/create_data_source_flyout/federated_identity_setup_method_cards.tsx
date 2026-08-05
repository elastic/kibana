/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { FederatedIdentitySetupMethod } from './federated_identity_setup_values';

const fullWidthCardStyle = css`
  width: 100%;
`;

export interface FederatedIdentitySetupMethodCardOption {
  id: FederatedIdentitySetupMethod;
  label: string;
  icon: IconType;
  testSubj: string;
}

export function FederatedIdentitySetupMethodCards({
  options,
  selectedMethod,
  onMethodChange,
}: {
  options: FederatedIdentitySetupMethodCardOption[];
  selectedMethod: FederatedIdentitySetupMethod;
  onMethodChange: (method: FederatedIdentitySetupMethod) => void;
}) {
  const groupName = useGeneratedHtmlId({ prefix: 'federatedIdentitySetupMethod' });
  const legend = i18n.translate('xpack.dataFederation.createFlyout.federated.setupMethod.legend', {
    defaultMessage: 'Federated identity setup method',
  });

  return (
    <fieldset aria-label={legend} data-test-subj="federatedIdentitySetupMethodCards">
      <legend className="euiScreenReaderOnly">{legend}</legend>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        {options.map((option) => (
          <EuiFlexItem key={option.id}>
            <FederatedIdentitySetupMethodCard
              groupName={groupName}
              option={option}
              selectedMethod={selectedMethod}
              onMethodChange={onMethodChange}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </fieldset>
  );
}

function FederatedIdentitySetupMethodCard({
  groupName,
  option,
  selectedMethod,
  onMethodChange,
}: {
  groupName: string;
  option: FederatedIdentitySetupMethodCardOption;
  selectedMethod: FederatedIdentitySetupMethod;
  onMethodChange: (method: FederatedIdentitySetupMethod) => void;
}) {
  const cardId = useGeneratedHtmlId({ prefix: `federatedIdentitySetupMethod-${option.id}` });

  return (
    <EuiCheckableCard
      id={cardId}
      name={groupName}
      css={fullWidthCardStyle}
      data-test-subj={option.testSubj}
      checked={selectedMethod === option.id}
      onChange={() => onMethodChange(option.id)}
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
