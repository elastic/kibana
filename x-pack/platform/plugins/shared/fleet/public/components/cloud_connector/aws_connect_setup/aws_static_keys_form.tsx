/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldPassword, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  CancelReplaceButton,
  StoredSecretField,
  useStoredSecretFields,
} from './stored_secret_field';

export const AWS_STATIC_KEYS_FORM_TEST_SUBJ = 'awsStaticKeysForm';

export interface AwsStaticKeyCredentials {
  access_key_id: string;
  secret_access_key: string;
}

export interface AwsStaticKeysFormProps {
  hasInvalidRequiredVars?: boolean;
  initialValues?: Partial<AwsStaticKeyCredentials>;
  /**
   * Fields whose value is already stored as a secret on the deployed policy. Each is shown as a
   * "Stored secret" placeholder with a Replace action, counts as filled for `onReadyChange`, and
   * is reported as an empty string by `onFieldsChange` until replaced.
   */
  storedSecretFields?: ReadonlyArray<keyof AwsStaticKeyCredentials>;
  onReadyChange?: (isReady: boolean) => void;
  onFieldsChange?: (fields: AwsStaticKeyCredentials | undefined) => void;
}

export const AwsStaticKeysForm: React.FC<AwsStaticKeysFormProps> = ({
  hasInvalidRequiredVars = false,
  initialValues,
  storedSecretFields,
  onReadyChange,
  onFieldsChange,
}) => {
  const [fields, setFields] = useState<AwsStaticKeyCredentials>({
    access_key_id: initialValues?.access_key_id ?? '',
    secret_access_key: initialValues?.secret_access_key ?? '',
  });

  const { isStored, replace, cancel, canCancel } = useStoredSecretFields(
    storedSecretFields,
    initialValues
  );
  // The stored credentials are replaced or kept together; a replaced field starts empty, not with
  // the value kept in memory from an earlier entry.
  const withoutStoredFields = (current: typeof fields) => ({
    ...current,
    ...Object.fromEntries((storedSecretFields ?? []).map((field) => [field, ''])),
  });
  const handleReplace = () => {
    replace();
    setFields(withoutStoredFields);
  };
  const handleCancelReplace = () => {
    cancel();
    const next = withoutStoredFields(fields);
    setFields(next);
    // Whatever is still typed in a field that is not stored stays and is still reported; when
    // nothing is typed any more, nothing is entered.
    onFieldsChange?.(Object.values(next).some(Boolean) ? next : undefined);
  };
  const hasAccessKeyId = !!fields.access_key_id || isStored('access_key_id');
  const hasSecretAccessKey = !!fields.secret_access_key || isStored('secret_access_key');

  useEffect(() => {
    onReadyChange?.(hasAccessKeyId && hasSecretAccessKey);
  }, [hasAccessKeyId, hasSecretAccessKey, onReadyChange]);

  const handleChange = (key: keyof AwsStaticKeyCredentials, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    const hasKeyId = !!next.access_key_id || isStored('access_key_id');
    onFieldsChange?.(hasKeyId ? next : undefined);
  };

  const accessKeyIdInvalid = hasInvalidRequiredVars && !hasAccessKeyId;
  const secretAccessKeyInvalid = hasInvalidRequiredVars && !hasSecretAccessKey;

  return (
    <div data-test-subj={AWS_STATIC_KEYS_FORM_TEST_SUBJ}>
      <EuiFormRow
        label={i18n.translate('xpack.fleet.awsStaticKeysForm.accessKeyIdLabel', {
          defaultMessage: 'Access key ID',
        })}
        isInvalid={accessKeyIdInvalid}
        error={
          accessKeyIdInvalid
            ? i18n.translate('xpack.fleet.awsStaticKeysForm.accessKeyIdRequired', {
                defaultMessage: 'Access key ID is required',
              })
            : undefined
        }
        fullWidth
      >
        {isStored('access_key_id') ? (
          <StoredSecretField
            onReplace={handleReplace}
            data-test-subj={`${AWS_STATIC_KEYS_FORM_TEST_SUBJ}-accessKeyId`}
          />
        ) : (
          <EuiFieldText
            fullWidth
            value={fields.access_key_id}
            isInvalid={accessKeyIdInvalid}
            onChange={(e) => handleChange('access_key_id', e.target.value)}
            data-test-subj={`${AWS_STATIC_KEYS_FORM_TEST_SUBJ}-accessKeyId`}
          />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.fleet.awsStaticKeysForm.secretAccessKeyLabel', {
          defaultMessage: 'Secret access key',
        })}
        isInvalid={secretAccessKeyInvalid}
        error={
          secretAccessKeyInvalid
            ? i18n.translate('xpack.fleet.awsStaticKeysForm.secretAccessKeyRequired', {
                defaultMessage: 'Secret access key is required',
              })
            : undefined
        }
        fullWidth
      >
        {isStored('secret_access_key') ? (
          <StoredSecretField
            onReplace={handleReplace}
            data-test-subj={`${AWS_STATIC_KEYS_FORM_TEST_SUBJ}-secretAccessKey`}
          />
        ) : (
          <EuiFieldPassword
            fullWidth
            value={fields.secret_access_key}
            isInvalid={secretAccessKeyInvalid}
            onChange={(e) => handleChange('secret_access_key', e.target.value)}
            data-test-subj={`${AWS_STATIC_KEYS_FORM_TEST_SUBJ}-secretAccessKey`}
          />
        )}
      </EuiFormRow>
      {canCancel && (
        <CancelReplaceButton
          onCancel={handleCancelReplace}
          data-test-subj={AWS_STATIC_KEYS_FORM_TEST_SUBJ}
        />
      )}
    </div>
  );
};
