/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import { EuiSpacer, EuiText } from '@elastic/eui';

import {
  FederatedIdentitySetupMethodCards,
  type FederatedIdentitySetupMethodCardOption,
} from './federated_identity_setup_method_cards';
import type { FederatedIdentitySetupMethod } from './federated_identity_setup_values';

export function FederatedIdentitySetupShell({
  description,
  oneClickLabel,
  oneClickIcon,
  testSubjPrefix,
  children,
}: {
  description: string;
  oneClickLabel?: string;
  oneClickIcon?: IconType;
  testSubjPrefix: string;
  children: (setupMethod: FederatedIdentitySetupMethod) => React.ReactNode;
}) {
  const [setupMethod, setSetupMethod] = useState<FederatedIdentitySetupMethod>('one_click');

  const setupMethodOptions = useMemo(
    (): FederatedIdentitySetupMethodCardOption[] => [
      {
        id: 'one_click',
        label:
          oneClickLabel ??
          i18n.translate('xpack.dataFederation.createFlyout.federated.setupMethod.oneClick', {
            defaultMessage: 'One-click deploy',
          }),
        icon: oneClickIcon ?? 'cloudStormy',
        testSubj: `${testSubjPrefix}SetupMethod-one_click`,
      },
      {
        id: 'manual',
        label: i18n.translate('xpack.dataFederation.createFlyout.federated.setupMethod.manual', {
          defaultMessage: 'Manual',
        }),
        icon: 'console',
        testSubj: `${testSubjPrefix}SetupMethod-manual`,
      },
    ],
    [oneClickIcon, oneClickLabel, testSubjPrefix]
  );

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <FederatedIdentitySetupMethodCards
        options={setupMethodOptions}
        selectedMethod={setupMethod}
        onMethodChange={setSetupMethod}
      />
      <EuiSpacer size="m" />
      {children(setupMethod)}
    </>
  );
}
