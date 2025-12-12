/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface NoChangePointsCalloutProps {
  reason?: string;
}

export const NoChangePointsCallout: FC<NoChangePointsCalloutProps> = ({ reason }) => {
  return (
    <EuiCallOut
      data-test-subj="aiopsNoChangePointsWarningCallout"
      title={
        <FormattedMessage
          id="xpack.aiops.changePointDetection.noChangePointsFoundTitle"
          defaultMessage="No change points found"
        />
      }
      color="warning"
      iconType="warning"
    >
      <p data-test-subj="aiopsNoChangePointsWarningCalloutText">
        {reason ? (
          <FormattedMessage
            id="xpack.aiops.changePointDetection.reasonWithSampleMetricData"
            defaultMessage="{reason} - showing sample metric data"
            values={{ reason }}
          />
        ) : (
          <FormattedMessage
            id="xpack.aiops.changePointDetection.noChangePointsFoundMessage"
            defaultMessage="No change points detected - showing sample metric data"
          />
        )}
      </p>
    </EuiCallOut>
  );
};
