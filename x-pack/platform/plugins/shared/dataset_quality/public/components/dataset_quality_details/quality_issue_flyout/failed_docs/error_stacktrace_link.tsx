/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLink } from '@elastic/eui';
import React from 'react';
import { NavigationSource } from '../../../../services/telemetry';
import { FAILURE_STORE_SELECTOR } from '../../../../../common/constants';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetQualityDetailsState,
  useRedirectLink,
} from '../../../../hooks';

export const ErrorStacktraceLink = ({
  errorType,
  children,
}: {
  errorType: string;
  children?: React.ReactNode;
}) => {
  const { datasetDetails, timeRange } = useDatasetQualityDetailsState();
  const query = { language: 'kuery', query: `error.type: "${errorType}"` };
  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query,
    navigationSource: NavigationSource.FailedDocsFlyoutErrorsTable,
  });

  const { linkProps } = useRedirectLink({
    dataStreamStat: datasetDetails,
    query,
    sendTelemetry,
    timeRangeConfig: timeRange,
    selector: FAILURE_STORE_SELECTOR,
  });

  return (
    <EuiBadge color="hollow">
      <strong>{errorType}</strong>
      <EuiLink
        external
        {...linkProps}
        color="primary"
        data-test-subj={`datasetQualityTableDetailsLink-${datasetDetails.name}`}
        target="_blank"
      >
        {children}
      </EuiLink>
    </EuiBadge>
  );
};
