/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYTICS_STEPS } from '../../page';
import type { ValidationSummary } from './validation_step_wrapper';

export const ValidationStepDetails: FC<{
  setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
  state: State;
  validationSummary: ValidationSummary;
}> = ({ setCurrentStep, state, validationSummary }) => {
  const { isJobCreated } = state;
  const detailsFirstCol = [
    {
      title: i18n.translate(
        'xpack.ml.dataframe.analytics.create.validatioinDetails.successfulChecks',
        {
          defaultMessage: 'Successful checks',
        }
      ),
      description: (
        <>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">{validationSummary.success}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="check" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
  ];
  const detailsSecondCol = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.validatioinDetails.warnings', {
        defaultMessage: 'Warnings',
      }),
      description: (
        <>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="s">{validationSummary.warning}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
  ];
  return (
    <>
      <EuiFlexGroup style={{ width: '70%' }}>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList compressed listItems={detailsFirstCol} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList
            style={{ wordBreak: 'break-word' }}
            compressed
            listItems={detailsSecondCol}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {!isJobCreated && (
        <EuiButtonEmpty
          size="s"
          onClick={() => {
            setCurrentStep(ANALYTICS_STEPS.VALIDATION);
          }}
        >
          {i18n.translate('xpack.ml.dataframe.analytics.create.validationDetails.viewButtonText', {
            defaultMessage: 'View',
          })}
        </EuiButtonEmpty>
      )}
    </>
  );
};
