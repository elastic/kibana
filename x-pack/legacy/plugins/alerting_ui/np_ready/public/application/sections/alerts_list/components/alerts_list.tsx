/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageContent, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { RouteComponentProps } from 'react-router-dom';

interface AlertsListProps {
  api: any;
}

export const AlertsList: React.FunctionComponent<RouteComponentProps<AlertsListProps>> = ({
  match: {
    params: { api },
  },
  history,
}) => {
  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.alertingUI.sections.alertsList.emptyPromptTitle"
              defaultMessage="You don’t have any alerts yet"
            />
          </h1>
        }
        body={'emptyPromptBody'}
        data-test-subj="emptyPrompt"
      />
    </EuiPageContent>
  );
};
