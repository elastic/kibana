/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export const OptionalFieldLabel = (
  <EuiText color="subdued" size="xs" data-test-subj="form-optional-field-label">
    {i18n.translate('xpack.stackConnectors.public.common.optionalFieldLabel', {
      defaultMessage: 'Optional',
    })}
  </EuiText>
);
