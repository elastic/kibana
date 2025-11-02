/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import React from 'react';
import { NavigationSource } from '../../../../services/telemetry';
import { FAILURE_STORE_SELECTOR } from '../../../../../common/constants';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetQualityDetailsState,
  useRedirectLink,
} from '../../../../hooks';

const ButtonStyles = ({ euiTheme }: UseEuiTheme) => ({
  fontWeight: euiTheme.font.weight.bold,
});

export const ErrorStacktraceLink = ({ errorType }: { errorType: string }) => {
  const { datasetDetails, timeRange } = useDatasetQualityDetailsState();
  const query = { language: 'kuery', query: `error.type: "${errorType}"` };
  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query,
    navigationSource: NavigationSource.FailedDocsFlyoutErrorsTable,
  });

  const { linkProps } = useRedirectLink({
    dataStreamStat: datasetDetails.rawName,
    query,
    sendTelemetry,
    timeRangeConfig: timeRange,
    selector: FAILURE_STORE_SELECTOR,
    external: true,
  });

  return (
    <EuiButton
      color="text"
      iconType="popout"
      iconSide="right"
      target="_blank"
      size="s"
      role="link"
      element="a"
      data-test-subj={`datasetQualityTableDetailsLink-${datasetDetails.name}`}
      textProps={{
        css: ButtonStyles,
      }}
      {...linkProps}
    >
      {errorType}
    </EuiButton>
  );
};
