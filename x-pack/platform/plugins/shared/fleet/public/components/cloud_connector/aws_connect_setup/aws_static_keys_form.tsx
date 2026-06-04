/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CloudFormationCloudCredentialsGuide } from '../aws_cloud_connector/aws_cloud_formation_guide';

export const AWS_STATIC_KEYS_FORM_TEST_SUBJ = 'awsStaticKeysForm';

export interface AwsStaticKeyCredentials {
  access_key_id: string;
  secret_access_key: string;
}

export interface AwsStaticKeysFormProps {
  hasInvalidRequiredVars?: boolean;
  initialValues?: Partial<AwsStaticKeyCredentials>;
  iacTemplateUrl?: string;
  onReadyChange?: (isReady: boolean) => void;
  onFieldsChange?: (fields: AwsStaticKeyCredentials | undefined) => void;
}

export const AwsStaticKeysForm: React.FC<AwsStaticKeysFormProps> = ({
  hasInvalidRequiredVars = false,
  initialValues,
  iacTemplateUrl,
  onReadyChange,
  onFieldsChange,
}) => {
  const [fields, setFields] = useState<AwsStaticKeyCredentials>({
    access_key_id: initialValues?.access_key_id ?? '',
    secret_access_key: initialValues?.secret_access_key ?? '',
  });

  useEffect(() => {
    onReadyChange?.(!!fields.access_key_id && !!fields.secret_access_key);
  }, [fields.access_key_id, fields.secret_access_key, onReadyChange]);

  const handleChange = (key: keyof AwsStaticKeyCredentials, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    onFieldsChange?.(next.access_key_id ? next : undefined);
  };

  const accessKeyIdInvalid = hasInvalidRequiredVars && !fields.access_key_id;
  const secretAccessKeyInvalid = hasInvalidRequiredVars && !fields.secret_access_key;

  return (
    <div data-test-subj={AWS_STATIC_KEYS_FORM_TEST_SUBJ}>
      <EuiAccordion
        id="awsStaticKeysGuide"
        buttonContent={
          <EuiLink>
            <FormattedMessage
              id="xpack.fleet.awsStaticKeysForm.stepsToCreateKeys"
              defaultMessage="Steps to Generate AWS Account Credentials"
            />
          </EuiLink>
        }
        paddingSize="l"
      >
        <CloudFormationCloudCredentialsGuide credentialType="direct_access_keys" />
      </EuiAccordion>
      <EuiSpacer size="l" />
      <EuiButton
        target="_blank"
        iconSide="left"
        iconType="rocket"
        href={iacTemplateUrl}
        isDisabled={!iacTemplateUrl}
        data-test-subj={`${AWS_STATIC_KEYS_FORM_TEST_SUBJ}-launchCloudFormation`}
      >
        <FormattedMessage
          id="xpack.fleet.awsStaticKeysForm.launchCloudFormation"
          defaultMessage="Launch CloudFormation"
        />
      </EuiButton>
      <EuiSpacer size="m" />

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
        <EuiFieldText
          fullWidth
          value={fields.access_key_id}
          isInvalid={accessKeyIdInvalid}
          onChange={(e) => handleChange('access_key_id', e.target.value)}
          data-test-subj={`${AWS_STATIC_KEYS_FORM_TEST_SUBJ}-accessKeyId`}
        />
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
        <EuiFieldPassword
          fullWidth
          value={fields.secret_access_key}
          isInvalid={secretAccessKeyInvalid}
          onChange={(e) => handleChange('secret_access_key', e.target.value)}
          data-test-subj={`${AWS_STATIC_KEYS_FORM_TEST_SUBJ}-secretAccessKey`}
        />
      </EuiFormRow>
    </div>
  );
};
