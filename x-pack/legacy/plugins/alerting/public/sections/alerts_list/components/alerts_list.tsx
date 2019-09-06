/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { EuiPageContent, EuiText, EuiEmptyPrompt } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import chrome, { Chrome } from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { listBreadcrumb } from '../../../lib/breadcrumbs';

type AlertsListProps = {
  breadcrumbs: Chrome['breadcrumbs'];
};

export const AlertsList = ({ breadcrumbs }: AlertsListProps) => {
  useEffect(() => {
    breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb]);
  }, []);

  return <NoAlerts />;
};

AlertsList.defaultProps = {
  breadcrumbs: chrome.breadcrumbs,
};

export const NoAlerts = () => {
  const alertingDescriptionText = (
    <FormattedMessage
      id="xpack.alerting.sections.alertsList.subhead"
      defaultMessage="Watch for changes or anomalies in your data and take action if needed."
    />
  );

  const emptyPromptBody = (
    <EuiText color="subdued">
      <p>{alertingDescriptionText}</p>
    </EuiText>
  );

  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.alerting.sections.alertsList.emptyPromptTitle"
              defaultMessage="You don’t have any alerts yet"
            />
          </h1>
        }
        body={emptyPromptBody}
        data-test-subj="emptyPrompt"
      />
    </EuiPageContent>
  );
};
