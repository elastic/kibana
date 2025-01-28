/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';

export const TabRequest = ({ json, endpoint }) => {
  const request = `${endpoint}\n${JSON.stringify(json, null, 2)}`;

  return (
    <Fragment>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.rollupJobs.jobDetails.tabRequest.descriptionText"
            defaultMessage="This Elasticsearch request will create this rollup job."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiCodeBlock language="json" isCopyable>
        {request}
      </EuiCodeBlock>
    </Fragment>
  );
};
