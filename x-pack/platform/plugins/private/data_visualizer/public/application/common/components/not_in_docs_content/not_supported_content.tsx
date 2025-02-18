/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIcon, EuiText } from '@elastic/eui';
import type { FC } from 'react';

export const NotSupportedContent: FC = () => (
  <Fragment>
    <EuiText textAlign="center">
      <EuiIcon type="warning" />
    </EuiText>
    <EuiText textAlign="center" size={'xs'}>
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.analysisNotSupportedLabel"
        defaultMessage="Analysis is not available for this field."
      />
    </EuiText>
  </Fragment>
);
