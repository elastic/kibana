/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

/** Use as `EuiFormRow` `labelAppend` for fields that are not required. */
export const optionalFieldLabelAppend = (
  <EuiText size="xs" color="subdued">
    {i18n.translate('xpack.alertingV2.notificationPolicy.form.field.optionalLabel', {
      defaultMessage: 'Optional',
    })}
  </EuiText>
);
