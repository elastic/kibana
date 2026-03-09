/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const panelCss = {
  maxWidth: '500px',
  marginRight: 'auto',
  marginLeft: 'auto',
};

const NotFoundPageComponent = () => (
  <div>
    <EuiSpacer />
    <EuiPanel css={panelCss}>
      <EuiEmptyPrompt
        iconType="logoElastic"
        iconColor="default"
        data-test-subj="osqueryNotFoundPage"
        title={
          <h2>
            <FormattedMessage
              id="xpack.osquery.notFoundPage.title"
              defaultMessage="Page not found"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.osquery.notFoundPage.description"
              defaultMessage="Sorry, the page you are looking for could not be found."
            />
          </p>
        }
      />
    </EuiPanel>
    <EuiSpacer />
  </div>
);

export const NotFoundPage = React.memo(NotFoundPageComponent);
