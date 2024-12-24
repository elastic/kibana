/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiTitle, EuiText, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const WhatIs = () => {
  return (
    <Fragment>
      <EuiTitle size="l">
        <h2>
          <FormattedMessage
            id="xpack.monitoring.noData.blurbs.monitoringIsOffTitle"
            defaultMessage="Monitoring is currently off"
          />
        </h2>
      </EuiTitle>
      <EuiTextColor color="subdued">
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.blurbs.monitoringIsOffDescription"
              defaultMessage="Monitoring provides insight to your hardware performance and load."
            />
          </p>
        </EuiText>
      </EuiTextColor>
    </Fragment>
  );
};
