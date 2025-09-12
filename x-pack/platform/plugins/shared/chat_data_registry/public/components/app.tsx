/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { PLUGIN_NAME } from '../../common';

export const ChatDataRegistryApp = () => {
  return (
    <h1>
      <FormattedMessage
        id="chatDataRegistry.helloWorldText"
        defaultMessage="{name}"
        values={{ name: PLUGIN_NAME }}
      />
    </h1>
  );
};
