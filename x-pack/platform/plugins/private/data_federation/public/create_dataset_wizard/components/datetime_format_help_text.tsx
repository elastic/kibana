/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { DEFAULT_DATETIME_FORMAT } from '../create_dataset_form_state';

export function DatetimeFormatHelpText() {
  return (
    <FormattedMessage
      id="xpack.dataFederation.createDatasetWizard.datetimeFormatHelpText"
      defaultMessage="{defaultValue} by default (ISO-8601)"
      values={{ defaultValue: <EuiCode>{DEFAULT_DATETIME_FORMAT}</EuiCode> }}
    />
  );
}
