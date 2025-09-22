/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';

import { PLUGIN_NAME } from '../../common';

export const ChatDataRegistryApp = () => {
  return (
    <I18nProvider>
      <h1>
        <FormattedMessage
          id="chatDataRegistry.helloWorldText"
          defaultMessage="{name}"
          values={{ name: PLUGIN_NAME }}
        />
      </h1>
    </I18nProvider>
  );
};
