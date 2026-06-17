/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const MissingDecisionPathCallout = () => {
  return (
    <EuiCallOut color={'warning'}>
      <FormattedMessage
        id="xpack.ml.dataframe.analytics.explorationResults.regressionDecisionPathDataMissingCallout"
        defaultMessage="No decision path data available."
      />
    </EuiCallOut>
  );
};
