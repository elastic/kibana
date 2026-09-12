/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { AgentPolicy, EnrollmentAPIKey } from '../types';
import { useInput, useStartServices, sendCreateEnrollmentAPIKey } from '../hooks';
import { isValidEnrollmentKeyExpiration } from '../../common/services';

function validatePolicyId(value: string) {
  if (value === '') {
    return [
      i18n.translate('xpack.fleet.newEnrollmentKeyForm.policyIdRequireErrorMessage', {
        defaultMessage: 'Policy is required',
      }),
    ];
  }
}

function validateExpiration(value: string) {
  if (value !== '' && !isValidEnrollmentKeyExpiration(value)) {
    return [
      i18n.translate('xpack.fleet.newEnrollmentKeyForm.expirationInvalidErrorMessage', {
        defaultMessage: 'Expiration must be a valid duration (for example, 30d, 24h, 90m, 60s)',
      }),
    ];
  }
}

function useCreateApiKeyForm(
  policyIdDefaultValue: string | undefined,
  onSuccess: (key: EnrollmentAPIKey) => void,
  onError: (error: Error) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const apiKeyNameInput = useInput('');
  const expirationInput = useInput('', validateExpiration);
  const policyIdInput = useInput(policyIdDefaultValue, validatePolicyId);

  const onSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!policyIdInput.validate() || !apiKeyNameInput.validate() || !expirationInput.validate()) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await sendCreateEnrollmentAPIKey({
        name: apiKeyNameInput.value,
        policy_id: policyIdInput.value,
        ...(expirationInput.value ? { expiration: expirationInput.value } : {}),
      });

      if (res.error) {
        throw res.error;
      }
      policyIdInput.clear();
      apiKeyNameInput.clear();
      expirationInput.clear();
      setIsLoading(false);
      if (res.data?.item) {
        onSuccess(res.data.item);
      }
    } catch (error) {
      setIsLoading(false);
      onError(error);
    }
  };

  return {
    isLoading,
    onSubmit,
    policyIdInput,
    apiKeyNameInput,
    expirationInput,
  };
}

interface Props {
  onClose: (key?: EnrollmentAPIKey) => void;
  agentPolicies?: AgentPolicy[];
}

export const NewEnrollmentTokenModal: React.FunctionComponent<Props> = ({
  onClose,
  agentPolicies = [],
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();

  const { notifications } = useStartServices();

  const selectPolicyOptions = useMemo(() => {
    return agentPolicies
      .filter((agentPolicy) => !agentPolicy.is_managed && !agentPolicy.supports_agentless)
      .map((agentPolicy) => ({
        key: agentPolicy.id,
        label: agentPolicy.name,
      }));
  }, [agentPolicies]);

  const form = useCreateApiKeyForm(
    selectPolicyOptions.length > 0 ? selectPolicyOptions[0].key : undefined,
    (key: EnrollmentAPIKey) => {
      onClose(key);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.newEnrollmentKey.keyCreatedToasts', {
          defaultMessage: 'Enrollment token created',
        })
      );
    },
    (error: Error) => {
      notifications.toasts.addError(error, {
        title: 'Error',
      });
    }
  );

  const body = (
    <EuiForm>
      <form onSubmit={form.onSubmit}>
        <EuiFormRow
          label={i18n.translate('xpack.fleet.newEnrollmentKey.nameLabel', {
            defaultMessage: 'Token name',
          })}
          helpText={i18n.translate('xpack.fleet.newEnrollmentKey.helpText', {
            defaultMessage: 'Token id will be used when this is left empty.',
          })}
        >
          <EuiFieldText
            data-test-subj="createEnrollmentTokenNameField"
            name="name"
            autoComplete="off"
            placeholder={i18n.translate('xpack.fleet.newEnrollmentKey.placeholder', {
              defaultMessage: 'Enter a token name',
            })}
            {...form.apiKeyNameInput.props}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.fleet.newEnrollmentKey.expirationLabel', {
            defaultMessage: 'Expiration',
          })}
          helpText={i18n.translate('xpack.fleet.newEnrollmentKey.expirationHelpText', {
            defaultMessage:
              'Optional. How long until the token expires (for example, 30d, 24h, 90m). Leave empty for a token that never expires.',
          })}
          {...form.expirationInput.formRowProps}
        >
          <EuiFieldText
            data-test-subj="createEnrollmentTokenExpirationField"
            name="expiration"
            autoComplete="off"
            placeholder={i18n.translate('xpack.fleet.newEnrollmentKey.expirationPlaceholder', {
              defaultMessage: 'For example, 30d',
            })}
            {...form.expirationInput.props}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.fleet.newEnrollmentKey.policyLabel', {
            defaultMessage: 'Policy',
          })}
          {...form.policyIdInput.formRowProps}
        >
          <EuiComboBox
            data-test-subj="createEnrollmentTokenSelectField"
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={selectPolicyOptions}
            selectedOptions={
              form.policyIdInput.value
                ? [
                    selectPolicyOptions.find((option) => option.key === form.policyIdInput.value),
                  ].filter((v): v is NonNullable<typeof v> => v !== undefined)
                : []
            }
            onChange={(newOptions) => {
              const newValue = newOptions.length > 0 ? newOptions[0].key : '';
              form.policyIdInput.props.onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
            isClearable={true}
            isInvalid={form.policyIdInput.props.isInvalid}
          />
        </EuiFormRow>
      </form>
    </EuiForm>
  );

  return (
    <EuiConfirmModal
      isLoading={form.isLoading}
      aria-labelledby={confirmModalTitleId}
      title={i18n.translate('xpack.fleet.newEnrollmentKey.modalTitle', {
        defaultMessage: 'Create enrollment token',
      })}
      titleProps={{ id: confirmModalTitleId }}
      onCancel={() => onClose()}
      cancelButtonText={i18n.translate('xpack.fleet.newEnrollmentKey.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      onConfirm={form.onSubmit}
      confirmButtonText={i18n.translate('xpack.fleet.newEnrollmentKey.submitButton', {
        defaultMessage: 'Create enrollment token',
      })}
      confirmButtonDisabled={!form.policyIdInput.value}
    >
      {body}
    </EuiConfirmModal>
  );
};
