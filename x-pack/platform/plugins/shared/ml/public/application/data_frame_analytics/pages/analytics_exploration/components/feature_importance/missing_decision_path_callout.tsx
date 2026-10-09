/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

export const MissingDecisionPathCallout = () => {
  return (
    <KbnWarningCallout
      title={
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.explorationResults.regressionDecisionPathDataMissingCallout"
          defaultMessage="No decision path data available."
        />
      }
    />
  );
};
