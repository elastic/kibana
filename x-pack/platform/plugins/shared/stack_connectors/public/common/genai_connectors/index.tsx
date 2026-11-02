/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import type { ConfigFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

export const OptionalFieldLabel = (
  <EuiText size="xs" color="subdued" data-test-subj="optional-label">
    {i18n.OPTIONAL_LABEL}
  </EuiText>
);

export const temperatureField: ConfigFieldSchema = {
  id: 'temperature',
  label: i18n.TEMPERATURE_LABEL,
  isRequired: false,
  helpText: (
    <FormattedMessage
      defaultMessage="Temperature is a value that controls the randomness of the model's output."
      id="xpack.stackConnectors.components.temperature"
    />
  ),
  labelAppend: OptionalFieldLabel,
};

export const contextWindowLengthField: ConfigFieldSchema = {
  id: 'contextWindowLength',
  label: i18n.CONTEXT_WINDOW_LABEL,
  isRequired: false,
  helpText: (
    <FormattedMessage
      defaultMessage="(experimental) can be set to manually define the context length of the default model used by the connector. Useful for open source or more recent models."
      id="xpack.stackConnectors.components.bedrock.contextWindowLength"
    />
  ),
  labelAppend: OptionalFieldLabel,
};
