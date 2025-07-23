/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { ConfigFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

export const contextWindowLengthField: ConfigFieldSchema = {
  id: 'contextWindowLength',
  label: i18n.CONTEXT_WINDOW_LABEL,
  isRequired: false,
  helpText: (
    <FormattedMessage
      defaultMessage="Can be set to manually define the context length of the default model used by the connector. Useful for open source or more recent models"
      id="xpack.stackConnectors.components.bedrock.contextWindowLength"
    />
  ),
  euiFieldProps: {
    append: (
      <EuiText size="xs" color="subdued">
        {i18n.OPTIONAL_LABEL}
      </EuiText>
    ),
  },
};
