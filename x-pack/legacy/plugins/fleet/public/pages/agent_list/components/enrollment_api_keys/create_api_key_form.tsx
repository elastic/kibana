/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useInput, useLibs } from '../../../../hooks';
import { usePolicies } from './hooks';

export const CreateApiKeyForm: React.FC<{ onChange: () => void }> = ({ onChange }) => {
  const { data: policies } = usePolicies();
  const { inputs, onSubmit, submitted } = useCreateApiKey(() => onChange());

  return (
    <EuiFlexGroup style={{ maxWidth: 600 }}>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.fleet.apiKeysForm.nameLabel', {
            defaultMessage: 'Key Name',
          })}
        >
          <EuiFieldText autoComplete={'false'} {...inputs.nameInput.props} />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.fleet.apiKeysForm.policyLabel', {
            defaultMessage: 'Policy',
          })}
        >
          <EuiSelect
            {...inputs.policyIdInput.props}
            options={policies.map(policy => ({
              value: policy.id,
              text: policy.name,
            }))}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButton disabled={submitted} onClick={() => onSubmit()}>
            <FormattedMessage id="xpack.fleet.apiKeysForm.saveButton" defaultMessage="Save" />
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function useCreateApiKey(onSuccess: () => void) {
  const { enrollmentApiKeys } = useLibs();
  const [submitted, setSubmitted] = React.useState(false);
  const inputs = {
    nameInput: useInput(),
    policyIdInput: useInput('default'),
  };

  const onSubmit = async () => {
    setSubmitted(true);
    await enrollmentApiKeys.create({
      name: inputs.nameInput.value,
      policyId: inputs.policyIdInput.value,
    });
    setSubmitted(false);
    onSuccess();
  };

  return {
    inputs,
    onSubmit,
    submitted,
  };
}
