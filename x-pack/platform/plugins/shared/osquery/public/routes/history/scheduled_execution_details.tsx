/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams, Redirect } from 'react-router-dom';
import { EuiEmptyPrompt, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useRouterNavigate } from '../../common/lib/kibana';
import { pagePathGetters } from '../../common/page_paths';

const ScheduledExecutionDetailsPageComponent = () => {
  const { scheduleId, executionCount } = useParams<{
    scheduleId: string;
    executionCount: string;
  }>();

  const isValid = !!scheduleId && !!executionCount;

  useBreadcrumbs('history_scheduled_details', {
    scheduleId: scheduleId ?? '',
    executionCount: executionCount ?? '',
  });

  const historyPath = pagePathGetters.history();
  const historyNavProps = useRouterNavigate(historyPath);

  if (!isValid) {
    return <Redirect to={historyPath} />;
  }

  return (
    <>
      <EuiSpacer size="l" />
      <EuiEmptyPrompt
        iconType="clock"
        title={
          <h2>
            <FormattedMessage
              id="xpack.osquery.scheduledExecutionDetails.title"
              defaultMessage="Scheduled Execution Details"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.osquery.scheduledExecutionDetails.placeholder"
            defaultMessage="Detail view for schedule {scheduleId}, execution #{executionCount}."
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            values={{ scheduleId, executionCount }}
          />
        }
        actions={
          <EuiButtonEmpty {...historyNavProps} iconType="arrowLeft">
            <FormattedMessage
              id="xpack.osquery.scheduledExecutionDetails.backToHistory"
              defaultMessage="Back to History"
            />
          </EuiButtonEmpty>
        }
      />
    </>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
ScheduledExecutionDetailsPage.displayName = 'ScheduledExecutionDetailsPage';
