/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedDate, FormattedTime, FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSkeletonText, EuiButton } from '@elastic/eui';

import { useAppContext } from '../../../../app_context';

const i18nTexts = {
  calloutTitle: (warningsCount: number, previousCheck: string) => (
    <FormattedMessage
      id="xpack.upgradeAssistant.overview.verifyChanges.calloutTitle"
      defaultMessage="{warningsCount, plural, =0 {No} other {{warningsCount}}} deprecation {warningsCount, plural, one {issue} other {issues}} since {previousCheck}"
      values={{
        warningsCount,
        previousCheck: (
          <>
            <FormattedDate value={previousCheck} year="numeric" month="long" day="2-digit" />{' '}
            <FormattedTime value={previousCheck} timeZoneName="short" hour12={false} />
          </>
        ),
      }}
    />
  ),
  calloutBody: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.calloutBody', {
    defaultMessage: `After making changes, reset the counter and continue monitoring to verify you're no longer using deprecated features.`,
  }),
  loadingError: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.loadingError', {
    defaultMessage: 'An error occurred while retrieving the count of deprecation logs',
  }),
  retryButton: i18n.translate('xpack.upgradeAssistant.overview.verifyChanges.retryButton', {
    defaultMessage: 'Try again',
  }),
};

interface Props {
  checkpoint: string;
}

export const DeprecationsCountCallout: FunctionComponent<Props> = ({ checkpoint }) => {
  const {
    services: { api },
  } = useAppContext();
  const { data, error, isLoading, isInitialRequest, resendRequest } =
    api.getDeprecationLogsCount(checkpoint);

  const logsCount = data?.count || 0;
  const hasLogs = logsCount > 0;
  const calloutTint = hasLogs ? 'warning' : 'success';
  const calloutIcon = hasLogs ? 'warning' : 'check';
  const calloutTestId = hasLogs ? 'hasWarningsCallout' : 'noWarningsCallout';

  if (isInitialRequest && isLoading) {
    return <EuiSkeletonText lines={6} />;
  }

  if (error) {
    return (
      <EuiCallOut
        title={i18nTexts.loadingError}
        color="danger"
        iconType="warning"
        data-test-subj="errorCallout"
      >
        <p>
          {error.statusCode} - {error.message as string}
        </p>
        <EuiButton color="danger" onClick={resendRequest} data-test-subj="retryButton">
          {i18nTexts.retryButton}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={i18nTexts.calloutTitle(logsCount, checkpoint)}
      color={calloutTint}
      iconType={calloutIcon}
      data-test-subj={calloutTestId}
    />
  );
};
