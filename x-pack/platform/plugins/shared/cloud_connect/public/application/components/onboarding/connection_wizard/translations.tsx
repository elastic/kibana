/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';

export const STEP_1_TITLE = i18n.translate('xpack.cloudConnect.wizard.step1.title', {
  defaultMessage: 'Sign up/login to Elastic Cloud and get the API key',
});

export const STEP_1_DESCRIPTION = i18n.translate('xpack.cloudConnect.wizard.step1.description', {
  defaultMessage:
    "To get started, you need to have an account on Elastic Cloud with Admin priviledges and generate an API key. If you don't have one, follow the link below to sign up and generate the Cloud API key. Existing Cloud users can navigate to Connected clusters section on homepage to get started.",
});

export const STEP_2_TITLE = i18n.translate('xpack.cloudConnect.wizard.step2.title', {
  defaultMessage: 'Configure an encryption key in Kibana',
});

export const STEP_2_DESCRIPTION = i18n.translate('xpack.cloudConnect.wizard.step2.description', {
  defaultMessage:
    'You should configure an encryption key in Kibana before pasting the Cloud API key and establishing connection.',
});

export const STEP_3_TITLE = i18n.translate('xpack.cloudConnect.wizard.step3.title', {
  defaultMessage: 'Paste your Cloud API key in Kibana and establish the connection',
});

export const STEP_3_DESCRIPTION = i18n.translate('xpack.cloudConnect.wizard.step3.description', {
  defaultMessage:
    "Once you've configured the encryption key in Kibana, paste the Cloud connected API key you've generated below to establish the connection.",
});

export const SIGN_UP_BUTTON = i18n.translate('xpack.cloudConnect.wizard.signUpButton', {
  defaultMessage: 'Sign up',
});

export const LOGIN_BUTTON = i18n.translate('xpack.cloudConnect.wizard.loginButton', {
  defaultMessage: 'Login',
});

export const CONNECT_BUTTON = i18n.translate('xpack.cloudConnect.wizard.connectButton', {
  defaultMessage: 'Connect',
});

export const API_KEY_PLACEHOLDER = i18n.translate('xpack.cloudConnect.wizard.apiKeyPlaceholder', {
  defaultMessage: 'Paste your cloud connected API key',
});

export const OPTIONAL_STEP = i18n.translate('xpack.cloudConnect.wizard.optionalStep', {
  defaultMessage: 'Optional step',
});

export const getStep2Description = (docLinksSecureSavedObject: string) => (
  <FormattedMessage
    id="xpack.cloudConnect.wizard.step2.description"
    defaultMessage="You should configure {encryptionKeyLink} in Kibana before pasting the Cloud API key and establishing connection."
    values={{
      encryptionKeyLink: (
        <EuiLink href={docLinksSecureSavedObject} target="_blank">
          <FormattedMessage
            id="xpack.cloudConnect.wizard.step2.encryptionKeyLink"
            defaultMessage="an encryption key"
          />
        </EuiLink>
      ),
    }}
  />
);
