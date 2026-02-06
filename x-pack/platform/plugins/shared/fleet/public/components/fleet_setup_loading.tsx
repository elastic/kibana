/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';

export const FleetSetupLoading: React.FunctionComponent = () => (
  <EuiEmptyPrompt
    title={
      <h2>
        <FormattedMessage id="xpack.fleet.setup.titleLabel" defaultMessage="Loading Fleet..." />
      </h2>
    }
    titleSize="m"
    data-test-subj="fleetSetupLoading"
    body={<EuiLoadingSpinner size="xl" />}
  />
);
