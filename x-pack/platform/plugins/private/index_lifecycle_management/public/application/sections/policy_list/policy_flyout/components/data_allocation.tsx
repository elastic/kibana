/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  AllocateAction,
  PhaseWithAllocation,
  SerializedColdPhase,
  SerializedWarmPhase,
} from '../../../../../../common/types';
import { determineDataTierAllocationType } from '../../../../lib';
import type { ActionComponentProps } from './types';
import { ActionDescription } from './action_description';
import { i18nTexts } from '../../../edit_policy/i18n_texts';

const getAllocationDescription = (
  type: ReturnType<typeof determineDataTierAllocationType>,
  phase: PhaseWithAllocation,
  allocate?: AllocateAction
) => {
  if (type === 'none') {
    return i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationDisabledLabel', {
      defaultMessage: 'Disabled',
    });
  }
  if (type === 'node_roles') {
    const label =
      phase === 'warm'
        ? i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationWarmNodesLabel', {
            defaultMessage: 'Using warm nodes',
          })
        : i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationColdNodesdLabel', {
            defaultMessage: 'Using cold nodes',
          });
    return (
      <>
        {label}{' '}
        <EuiBadge color="success">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyFlyout.recommendedDataAllocationLabel"
            defaultMessage="Recommended"
          />
        </EuiBadge>
      </>
    );
  }
  if (type === 'node_attrs') {
    return (
      <>
        {i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationAttributtesLabel', {
          defaultMessage: 'Node attributes',
        })}
        {': '}
        <EuiCode>{JSON.stringify(allocate?.require)}</EuiCode>
      </>
    );
  }
};

export const DataAllocation = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const allocate = (phaseConfig as SerializedWarmPhase | SerializedColdPhase)?.actions.allocate;
  const migrate = (phaseConfig as SerializedWarmPhase | SerializedColdPhase)?.actions.migrate;
  const allocationType = determineDataTierAllocationType({ allocate, migrate });
  const allocationDescription = getAllocationDescription(
    allocationType,
    phase as PhaseWithAllocation,
    allocate
  );

  return (
    <ActionDescription
      title={i18nTexts.editPolicy.dataAllocationLabel}
      descriptionItems={allocationDescription ? [allocationDescription] : []}
    />
  );
};
