/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const optionalLabel = (
  <EuiText color="subdued" size="xs">
    {i18n.translate('xpack.alertingV2.actionPolicy.form.optionalLabel', {
      defaultMessage: 'Optional',
    })}
  </EuiText>
);
