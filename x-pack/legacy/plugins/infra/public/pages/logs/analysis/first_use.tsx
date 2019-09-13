/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export const FirstUseCallout = () => {
  return (
    <>
      <EuiCallOut
        color="success"
        title={i18n.translate('xpack.infra.logs.logsAnalysisResults.onboardingSuccessTitle', {
          defaultMessage: 'Success!',
        })}
      >
        <p>
          {i18n.translate('xpack.infra.logs.logsAnalysisResults.onboardingSuccessContent', {
            defaultMessage:
              'Please allow a few minutes for our machine learning robots to begin collecting data.',
          })}
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
