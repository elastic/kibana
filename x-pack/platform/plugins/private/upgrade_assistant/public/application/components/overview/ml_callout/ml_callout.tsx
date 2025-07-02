/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const MachineLearningDisabledCallout: React.FunctionComponent = () => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.overview.mlCallout.title"
            defaultMessage="Machine Learning is disabled in your cluster"
          />
        }
        color="warning"
        iconType="warning"
        data-test-subj="mlDisabledCallout"
      >
        <FormattedMessage
          id="xpack.upgradeAssistant.overview.mlCallout.description"
          defaultMessage="Upgrade Assistant will not be able to check for any Machine Learning deprecations or issues. Enable Machine Learning to use this feature."
        />
      </EuiCallOut>
    </>
  );
};
