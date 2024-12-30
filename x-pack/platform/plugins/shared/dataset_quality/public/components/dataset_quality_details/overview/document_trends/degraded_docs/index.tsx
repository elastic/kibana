/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  OnTimeChangeProps,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { css } from '@emotion/react';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram-plugin/public';
import {
  discoverAriaText,
  logsExplorerAriaText,
  openInDiscoverText,
  openInLogsExplorerText,
  overviewDegradedDocsText,
} from '../../../../../../common/translations';
import { DegradedDocsChart } from './degraded_docs_chart';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetQualityDetailsState,
  useDegradedDocsChart,
  useRedirectLink,
} from '../../../../../hooks';
import { _IGNORED } from '../../../../../../common/es_fields';
import { NavigationSource } from '../../../../../services/telemetry';

const degradedDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.degradedDocsTooltip"
    defaultMessage="The percentage of degraded documents —documents with the {ignoredProperty} property— in your data set."
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DegradedDocs({ lastReloadTime }: { lastReloadTime: number }) {
  const { timeRange, updateTimeRange, datasetDetails } = useDatasetQualityDetailsState();
  const { dataView, breakdown, ...chartProps } = useDegradedDocsChart();

  const accordionId = useGeneratedHtmlId({
    prefix: overviewDegradedDocsText,
  });

  const [breakdownDataViewField, setBreakdownDataViewField] = useState<DataViewField | undefined>(
    undefined
  );

  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query: { language: 'kuery', query: `${_IGNORED}: *` },
    navigationSource: NavigationSource.Trend,
  });

  const degradedDocLinkLogsExplorer = useRedirectLink({
    dataStreamStat: datasetDetails,
    timeRangeConfig: timeRange,
    query: { language: 'kuery', query: `${_IGNORED}: *` },
    breakdownField: breakdownDataViewField?.name,
    sendTelemetry,
  });

  useEffect(() => {
    if (breakdown.dataViewField && breakdown.fieldSupportsBreakdown) {
      setBreakdownDataViewField(breakdown.dataViewField);
    } else {
      setBreakdownDataViewField(undefined);
    }
  }, [setBreakdownDataViewField, breakdown]);

  const onTimeRangeChange = useCallback(
    ({ start, end }: Pick<OnTimeChangeProps, 'start' | 'end'>) => {
      updateTimeRange({ start, end, refreshInterval: timeRange.refresh.value });
    },
    [updateTimeRange, timeRange.refresh]
  );

  const accordionTitle = (
    <EuiFlexItem
      css={css`
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 4px;
      `}
    >
      <EuiTitle size={'xxs'}>
        <h5>{overviewDegradedDocsText}</h5>
      </EuiTitle>
      <EuiToolTip content={degradedDocsTooltip}>
        <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </EuiToolTip>
    </EuiFlexItem>
  );

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="none"
        initialIsOpen={true}
        data-test-subj="datasetQualityDetailsOverviewDocumentTrends"
      >
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiSkeletonRectangle width={160} height={32} isLoading={!dataView}>
            <UnifiedBreakdownFieldSelector
              dataView={dataView!}
              breakdown={{ field: breakdownDataViewField }}
              onBreakdownFieldChange={breakdown.onChange}
            />
          </EuiSkeletonRectangle>
          <EuiToolTip
            content={
              degradedDocLinkLogsExplorer.isLogsExplorerAvailable
                ? openInLogsExplorerText
                : openInDiscoverText
            }
          >
            <EuiButtonIcon
              display="base"
              iconType={
                degradedDocLinkLogsExplorer.isLogsExplorerAvailable
                  ? 'logoObservability'
                  : 'discoverApp'
              }
              aria-label={
                degradedDocLinkLogsExplorer.isLogsExplorerAvailable
                  ? logsExplorerAriaText
                  : discoverAriaText
              }
              size="s"
              data-test-subj="datasetQualityDetailsLinkToDiscover"
              {...degradedDocLinkLogsExplorer.linkProps}
            />
          </EuiToolTip>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <DegradedDocsChart
          {...chartProps}
          timeRange={timeRange}
          lastReloadTime={lastReloadTime}
          onTimeRangeChange={onTimeRangeChange}
        />
      </EuiAccordion>
    </EuiPanel>
  );
}
