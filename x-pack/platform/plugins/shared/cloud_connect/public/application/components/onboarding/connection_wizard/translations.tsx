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
    'If you already have an Elastic Cloud account with admin privileges, log in to generate the Cloud Connect API key.',
});

export const STEP_1_DESCRIPTION_2 = i18n.translate('xpack.cloudConnect.wizard.step1.description', {
  defaultMessage:
    'If you don’t have an account yet, sign up and follow the prompts to create your account and start a free trial, and then generate the Cloud Connect API key.',
});

export const STEP_2_TITLE = i18n.translate('xpack.cloudConnect.wizard.step2.title', {
  defaultMessage: 'Configure an encryption key',
});

export const getStep2Description = (docLinksSecureSavedObject: string) => (
  <FormattedMessage
    id="xpack.cloudConnect.wizard.step2.description"
    defaultMessage="Configure an {encryptionKeyLink} in Kibana."
    values={{
      encryptionKeyLink: (
        <EuiLink href={docLinksSecureSavedObject} target="_blank">
          <FormattedMessage
            id="xpack.cloudConnect.wizard.step2.encryptionKeyLink"
            defaultMessage="encryption key"
          />
        </EuiLink>
      ),
    }}
  />
);

export const STEP_3_TITLE = i18n.translate('xpack.cloudConnect.wizard.step3.title', {
  defaultMessage: 'Paste your Cloud Connect API key and connect',
});

export const getStep3Description = () => (
  <FormattedMessage
    id="xpack.cloudConnect.wizard.step3.description"
    defaultMessage="Paste your generated Cloud Connect API key in the following field and click {connect}."
    values={{
      connect: (
        <b>
          <FormattedMessage
            id="xpack.cloudConnect.wizard.step3.descriptionConnectLabel"
            defaultMessage="Connect"
          />
        </b>
      ),
    }}
  />
);

export const SIGN_UP_BUTTON = i18n.translate('xpack.cloudConnect.wizard.signUpButton', {
  defaultMessage: 'Sign up',
});

export const LOGIN_BUTTON = i18n.translate('xpack.cloudConnect.wizard.loginButton', {
  defaultMessage: 'Log in',
});

export const CONNECT_BUTTON = i18n.translate('xpack.cloudConnect.wizard.connectButton', {
  defaultMessage: 'Connect',
});

export const API_KEY_PLACEHOLDER = i18n.translate('xpack.cloudConnect.wizard.apiKeyPlaceholder', {
  defaultMessage: 'Paste your Cloud Connect API key',
});
