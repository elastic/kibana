/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldPassword, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const AWS_TEMPORARY_KEYS_FORM_TEST_SUBJ = 'awsTemporaryKeysForm';

export interface AwsTemporaryKeyCredentials {
  access_key_id: string;
  secret_access_key: string;
  session_token: string;
}

export interface AwsTemporaryKeysFormProps {
  hasInvalidRequiredVars?: boolean;
  initialValues?: Partial<AwsTemporaryKeyCredentials>;
  onReadyChange?: (isReady: boolean) => void;
  onFieldsChange?: (fields: AwsTemporaryKeyCredentials | undefined) => void;
}

export const AwsTemporaryKeysForm: React.FC<AwsTemporaryKeysFormProps> = ({
  hasInvalidRequiredVars = false,
  initialValues,
  onReadyChange,
  onFieldsChange,
}) => {
  const [fields, setFields] = useState<AwsTemporaryKeyCredentials>({
    access_key_id: initialValues?.access_key_id ?? '',
    secret_access_key: initialValues?.secret_access_key ?? '',
    session_token: initialValues?.session_token ?? '',
  });

  useEffect(() => {
    onReadyChange?.(!!fields.access_key_id && !!fields.secret_access_key && !!fields.session_token);
  }, [fields.access_key_id, fields.secret_access_key, fields.session_token, onReadyChange]);

  const handleChange = (key: keyof AwsTemporaryKeyCredentials, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    onFieldsChange?.(next.access_key_id ? next : undefined);
  };

  const accessKeyIdInvalid = hasInvalidRequiredVars && !fields.access_key_id;
  const secretAccessKeyInvalid = hasInvalidRequiredVars && !fields.secret_access_key;
  const sessionTokenInvalid = hasInvalidRequiredVars && !fields.session_token;

  return (
    <div data-test-subj={AWS_TEMPORARY_KEYS_FORM_TEST_SUBJ}>
      <EuiFormRow
        label={i18n.translate('xpack.fleet.awsTemporaryKeysForm.accessKeyIdLabel', {
          defaultMessage: 'Access key ID',
        })}
        isInvalid={accessKeyIdInvalid}
        error={
          accessKeyIdInvalid
            ? i18n.translate('xpack.fleet.awsTemporaryKeysForm.accessKeyIdRequired', {
                defaultMessage: 'Access key ID is required',
              })
            : undefined
        }
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={fields.access_key_id}
          isInvalid={accessKeyIdInvalid}
          onChange={(e) => handleChange('access_key_id', e.target.value)}
          data-test-subj={`${AWS_TEMPORARY_KEYS_FORM_TEST_SUBJ}-accessKeyId`}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.fleet.awsTemporaryKeysForm.secretAccessKeyLabel', {
          defaultMessage: 'Secret access key',
        })}
        isInvalid={secretAccessKeyInvalid}
        error={
          secretAccessKeyInvalid
            ? i18n.translate('xpack.fleet.awsTemporaryKeysForm.secretAccessKeyRequired', {
                defaultMessage: 'Secret access key is required',
              })
            : undefined
        }
        fullWidth
      >
        <EuiFieldPassword
          fullWidth
          value={fields.secret_access_key}
          isInvalid={secretAccessKeyInvalid}
          onChange={(e) => handleChange('secret_access_key', e.target.value)}
          data-test-subj={`${AWS_TEMPORARY_KEYS_FORM_TEST_SUBJ}-secretAccessKey`}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.fleet.awsTemporaryKeysForm.sessionTokenLabel', {
          defaultMessage: 'Session token',
        })}
        helpText={i18n.translate('xpack.fleet.awsTemporaryKeysForm.sessionTokenHelp', {
          defaultMessage: 'The session token returned by AWS STS for temporary credentials.',
        })}
        isInvalid={sessionTokenInvalid}
        error={
          sessionTokenInvalid
            ? i18n.translate('xpack.fleet.awsTemporaryKeysForm.sessionTokenRequired', {
                defaultMessage: 'Session token is required',
              })
            : undefined
        }
        fullWidth
      >
        <EuiFieldPassword
          fullWidth
          value={fields.session_token}
          isInvalid={sessionTokenInvalid}
          onChange={(e) => handleChange('session_token', e.target.value)}
          data-test-subj={`${AWS_TEMPORARY_KEYS_FORM_TEST_SUBJ}-sessionToken`}
        />
      </EuiFormRow>
    </div>
  );
};
