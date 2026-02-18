/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

const { emptyField, startsWithField, containsCharsField } = fieldValidators;

const MAX_POLICY_NAME_BYTES = 255;

const getPolicyNameIsBeyondMaxBytes = (policyName: string) => {
  return (
    window.TextEncoder && new window.TextEncoder().encode(policyName).length > MAX_POLICY_NAME_BYTES
  );
};

const getFirstAvailableCopyName = ({
  originalPolicyName,
  policyNames,
}: {
  originalPolicyName: string;
  policyNames: string[];
}) => {
  const existing = new Set(policyNames);

  // If the shortest candidate is already too long, any other single-digit suffix will be too.
  if (getPolicyNameIsBeyondMaxBytes(`${originalPolicyName}-2`)) {
    return '';
  }

  for (let i = 2; i <= 9; i++) {
    const candidate = `${originalPolicyName}-${i}`;
    if (!existing.has(candidate) && !getPolicyNameIsBeyondMaxBytes(candidate)) {
      return candidate;
    }
  }

  return '';
};

const i18nTexts = {
  errors: {
    policyNameRequiredMessage: i18n.translate('xpack.streams.createPolicyModal.emptyNameError', {
      defaultMessage: 'A policy name is required.',
    }),
    policyNameStartsWithUnderscoreErrorMessage: i18n.translate(
      'xpack.streams.createPolicyModal.underscoreError',
      {
        defaultMessage: 'A policy name cannot start with an underscore.',
      }
    ),
    policyNameContainsInvalidChars: i18n.translate(
      'xpack.streams.createPolicyModal.invalidCharsError',
      {
        defaultMessage: 'A policy name cannot contain spaces or commas.',
      }
    ),
    policyNameTooLongErrorMessage: i18n.translate('xpack.streams.createPolicyModal.tooLongError', {
      defaultMessage: 'A policy name cannot be longer than 255 bytes.',
    }),
    policyNameAlreadyUsedErrorMessage: i18n.translate(
      'xpack.streams.createPolicyModal.duplicateNameError',
      {
        defaultMessage: 'That policy name is already used.',
      }
    ),
  },
};

interface FormData {
  policyName: string;
}

export const createPolicyNameValidations = ({
  policies,
}: {
  policies: string[];
}): Array<{ validator: ValidationFunc<FormData, string, string> }> => {
  return [
    {
      validator: emptyField(i18nTexts.errors.policyNameRequiredMessage),
    },
    {
      validator: startsWithField({
        message: i18nTexts.errors.policyNameStartsWithUnderscoreErrorMessage,
        char: '_',
      }),
    },
    {
      validator: containsCharsField({
        message: i18nTexts.errors.policyNameContainsInvalidChars,
        chars: [',', ' '],
      }),
    },
    {
      validator: (arg) => {
        const policyName = arg.value;
        if (getPolicyNameIsBeyondMaxBytes(policyName)) {
          return {
            message: i18nTexts.errors.policyNameTooLongErrorMessage,
          };
        }
      },
    },
    {
      validator: (arg) => {
        const policyName = arg.value;
        if (policies.includes(policyName)) {
          return {
            message: i18nTexts.errors.policyNameAlreadyUsedErrorMessage,
          };
        }
      },
    },
  ];
};

export interface CreatePolicyModalProps {
  policyNames: string[];
  onBack: () => void;
  onSave: (policyName: string) => void;
  isLoading?: boolean;
  originalPolicyName: string;
}

export function CreatePolicyModal({
  policyNames,
  onBack,
  onSave,
  isLoading = false,
  originalPolicyName,
}: CreatePolicyModalProps) {
  const modalTitleId = useGeneratedHtmlId();
  const { form } = useForm({
    defaultValue: {
      policyName: getFirstAvailableCopyName({ originalPolicyName, policyNames }),
    },
  });

  const policyNameValidations = useMemo(
    () => createPolicyNameValidations({ policies: policyNames }),
    [policyNames]
  );

  const handleSave = async () => {
    const { isValid, data } = await form.submit();
    if (!isValid) {
      return;
    }
    onSave(data.policyName);
  };

  return (
    <EuiModal onClose={onBack} aria-labelledby={modalTitleId} style={{ width: '576px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId} data-test-subj="createPolicyModalTitle">
          {i18n.translate('xpack.streams.createPolicyModal.title', {
            defaultMessage: 'Save as new ILM policy',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <Form form={form}>
          <UseField
            path="policyName"
            component={Field}
            config={{
              label: i18n.translate('xpack.streams.createPolicyModal.policyNameLabel', {
                defaultMessage: 'Policy name',
              }),
              helpText: i18n.translate('xpack.streams.createPolicyModal.policyNameHelpText', {
                defaultMessage:
                  'A policy name cannot start with an underscore and cannot contain a comma or a space.',
              }),
              validations: policyNameValidations,
            }}
            componentProps={{
              isDisabled: isLoading,
              euiFieldProps: {
                'data-test-subj': 'createPolicyModal-policyNameInput',
                disabled: isLoading,
              },
            }}
          />
        </Form>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="createPolicyModal-backButton"
              onClick={onBack}
              disabled={isLoading}
            >
              {i18n.translate('xpack.streams.createPolicyModal.backButton', {
                defaultMessage: 'Back',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="createPolicyModal-saveButton"
              fill
              onClick={handleSave}
              disabled={form.isValid === false || isLoading}
              isLoading={isLoading}
            >
              {i18n.translate('xpack.streams.createPolicyModal.saveButton', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
