/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { FEATURE_STATES_NONE_OPTION } from '../../../../../../../../common/constants';
import { SlmPolicyPayload } from '../../../../../../../../common/types';
import { PolicyValidation } from '../../../../../../services/validation';

interface Props {
  policy: SlmPolicyPayload;
  onUpdate: (arg: Partial<SlmPolicyPayload['config']>) => void;
  errors: PolicyValidation['errors'];
}

export type FeaturesOption = EuiComboBoxOptionOption<string>;

export const IncludeGlobalStateField: FunctionComponent<Props> = ({ policy, onUpdate }) => {
  const { config = {} } = policy;

  const onIncludeGlobalStateToggle = (event: EuiSwitchEvent) => {
    const { checked } = event.target;
    const hasFeatureStates = !config?.featureStates?.includes(FEATURE_STATES_NONE_OPTION);

    onUpdate({
      includeGlobalState: checked,
      // if we ever include global state, we want to preselect featureStates for the users
      // so that we include all features as well.
      featureStates: checked && !hasFeatureStates ? [] : config.featureStates || [],
    });
  };

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescriptionTitle"
              defaultMessage="Include global state"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescription"
          defaultMessage="Stores the global cluster state as part of the snapshot."
        />
      }
      fullWidth
    >
      <EuiFormRow fullWidth>
        <EuiSwitch
          data-test-subj="globalStateToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.policyIncludeGlobalStateLabel"
              defaultMessage="Include global state"
            />
          }
          checked={config.includeGlobalState === undefined || config.includeGlobalState}
          onChange={onIncludeGlobalStateToggle}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
