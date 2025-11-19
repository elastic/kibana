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
  defaultMessage: 'Sign up or log in to Elastic Cloud and get the Cloud Connect API key',
});

export const STEP_1_DESCRIPTION_1 = i18n.translate('xpack.cloudConnect.wizard.step1.description', {
  defaultMessage:
    "If you have an existing Elastic Cloud account with Admin privileges, log in below to generate the Cloud Connect API key.",
});

export const STEP_1_DESCRIPTION_2 = i18n.translate('xpack.cloudConnect.wizard.step1.description', {
  defaultMessage:
    "Otherwise, sign up for an account below and follow the prompts to create your account and generate the Cloud Connect API key.",
});

export const STEP_2_TITLE = i18n.translate('xpack.cloudConnect.wizard.step2.title', {
  defaultMessage: 'Configure an encryption key',
});

export const getStep2Description = (docLinksSecureSavedObject: string) => (
  <FormattedMessage
    id="xpack.cloudConnect.wizard.step2.description"
    defaultMessage="Configure {encryptionKeyLink} in Kibana before moving to the next step."
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

export const STEP_3_TITLE = i18n.translate('xpack.cloudConnect.wizard.step3.title', {
  defaultMessage: 'Paste your Cloud Connect API key and connect',
});

export const STEP_3_DESCRIPTION = i18n.translate('xpack.cloudConnect.wizard.step3.description', {
  defaultMessage:
    "Paste your generated Cloud Connect API key in the field below and click Connect.",
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

