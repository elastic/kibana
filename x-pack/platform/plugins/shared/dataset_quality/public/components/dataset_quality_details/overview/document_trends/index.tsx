/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonGroup,
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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram-plugin/public';
import React, { useCallback } from 'react';
import {
  discoverAriaText,
  openInDiscoverText,
  overviewPanelDatasetQualityIndicatorDegradedDocs,
  overviewTrendsDocsText,
} from '../../../../../common/translations';
import { useDatasetQualityDetailsState, useQualityIssuesDocsChart } from '../../../../hooks';
import { QualityIssueType } from '../../../../state_machines/dataset_quality_details_controller';
import { useDatasetQualityDetailsContext } from '../../context';
import { TrendDocsChart } from './trend_docs_chart';

const trendDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.trendDocsTooltip"
    defaultMessage="The percentage of ignored fields or failed docs over the selected timeframe."
  />
);

const degradedDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.degradedDocsTooltip"
    defaultMessage="The number of degraded documents —documents with the {ignoredProperty} property— in your data set."
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
export default function DocumentTrends({ lastReloadTime }: { lastReloadTime: number }) {
  const { isFailureStoreEnabled } = useDatasetQualityDetailsContext();
  const { timeRange, updateTimeRange, docsTrendChart } = useDatasetQualityDetailsState();
  const {
    dataView,
    breakdown,
    redirectLinkProps,
    handleDocsTrendChartChange,
    ...qualityIssuesChartProps
  } = useQualityIssuesDocsChart();

  const accordionId = useGeneratedHtmlId({
    prefix: overviewTrendsDocsText,
  });

  const onTimeRangeChange = useCallback(
    ({ start, end }: Pick<OnTimeChangeProps, 'start' | 'end'>) => {
      updateTimeRange({ start, end, refreshInterval: timeRange.refresh.value });
    },
    [updateTimeRange, timeRange.refresh]
  );

  const accordionTitle = !isFailureStoreEnabled ? (
    <EuiFlexItem
      css={css`
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 4px;
      `}
    >
      <EuiTitle size={'xxs'}>
        <h5>{overviewPanelDatasetQualityIndicatorDegradedDocs}</h5>
      </EuiTitle>
      <EuiToolTip content={degradedDocsTooltip}>
        <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </EuiToolTip>
    </EuiFlexItem>
  ) : (
    <EuiFlexItem
      css={css`
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 4px;
      `}
    >
      <EuiTitle size={'xxs'}>
        <h5>{overviewTrendsDocsText}</h5>
      </EuiTitle>
      <EuiToolTip content={trendDocsTooltip}>
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
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem>
            {isFailureStoreEnabled && (
              <EuiButtonGroup
                data-test-subj="datasetQualityDetailsChartTypeButtonGroup"
                legend={i18n.translate('xpack.datasetQuality.details.chartTypeLegend', {
                  defaultMessage: 'Quality chart type',
                })}
                onChange={(id) => handleDocsTrendChartChange(id as QualityIssueType)}
                options={[
                  {
                    id: 'degraded',
                    label: i18n.translate('xpack.datasetQuality.details.chartType.degradedDocs', {
                      defaultMessage: 'Ignored fields',
                    }),
                  },
                  {
                    id: 'failed',
                    label: i18n.translate('xpack.datasetQuality.details.chartType.failedDocs', {
                      defaultMessage: 'Failed docs',
                    }),
                  },
                ]}
                idSelected={docsTrendChart}
              />
            )}
          </EuiFlexItem>
          <EuiSkeletonRectangle width={160} height={32} isLoading={!dataView}>
            <UnifiedBreakdownFieldSelector
              dataView={dataView!}
              breakdown={{
                field:
                  breakdown.dataViewField && breakdown.fieldSupportsBreakdown
                    ? breakdown.dataViewField
                    : undefined,
              }}
              onBreakdownFieldChange={breakdown.onChange}
            />
          </EuiSkeletonRectangle>
          <EuiToolTip content={openInDiscoverText}>
            <EuiButtonIcon
              display="base"
              iconType="discoverApp"
              aria-label={discoverAriaText}
              size="s"
              data-test-subj="datasetQualityDetailsLinkToDiscover"
              {...redirectLinkProps.linkProps}
            />
          </EuiToolTip>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <TrendDocsChart
          {...qualityIssuesChartProps}
          timeRange={timeRange}
          lastReloadTime={lastReloadTime}
          onTimeRangeChange={onTimeRangeChange}
        />
      </EuiAccordion>
    </EuiPanel>
  );
}
