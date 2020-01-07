/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import chrome from 'ui/chrome';

export const PopoverDescriptionComponent = () => (
  <EuiText size="s">
    <FormattedMessage
      defaultMessage="Run any of the Machine Learning jobs below to view anomalous events throughout the SIEM application. We’ve provided a few common detection jobs to get you started. If you wish to add your own custom jobs, simply create and tag them with “SIEM” from the {machineLearning} application for inclusion here."
      id="xpack.siem.components.mlPopup.anomalyDetectionDescription"
      values={{
        machineLearning: (
          <EuiLink href={`${chrome.getBasePath()}/app/ml`} target="_blank">
            <FormattedMessage
              defaultMessage="Machine Learning"
              id="xpack.siem.components.mlPopup.machineLearningLink"
            />
          </EuiLink>
        ),
      }}
    />
  </EuiText>
);

PopoverDescriptionComponent.displayName = 'PopoverDescriptionComponent';

export const PopoverDescription = React.memo(PopoverDescriptionComponent);

PopoverDescription.displayName = 'PopoverDescription';
