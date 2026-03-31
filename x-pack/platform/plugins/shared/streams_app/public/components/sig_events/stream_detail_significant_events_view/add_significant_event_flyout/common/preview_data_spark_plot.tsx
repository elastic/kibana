/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { niceTimeFormatter } from '@elastic/charts';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR, type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { AbsoluteTimeRange } from '@kbn/es-query';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { SparkPlot } from '../../../../spark_plot';
import { useSignificantEventPreviewFetch } from '../manual_flow_form/use_significant_event_preview_fetch';
import { useSparkplotDataFromSigEvents } from '../manual_flow_form/use_spark_plot_data_from_sig_events';
import { AssetImage } from '../../../../asset_image';

export function PreviewDataSparkPlot({
  query,
  definition,
  isQueryValid,
  showTitle = true,
  compressed = false,
  hideAxis = false,
  height,
  noOfBuckets,
  timeRange,
}: {
  definition: Streams.all.Definition;
  query: StreamQuery;
  isQueryValid: boolean;
  showTitle?: boolean;
  compressed?: boolean;
  hideAxis?: boolean;
  height?: number;
  noOfBuckets?: number;
  timeRange?: AbsoluteTimeRange;
}) {
  const { timeState } = useTimefilter();
  const { euiTheme } = useEuiTheme();
  const effectiveTimeRange = timeRange ?? timeState.asAbsoluteTimeRange;

  const previewFetch = useSignificantEventPreviewFetch({
    name: definition.name,
    esqlQuery: query.esql.query,
    timeRange: effectiveTimeRange,
    isQueryValid,
    noOfBuckets,
  });

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([
      new Date(effectiveTimeRange.from).getTime(),
      new Date(effectiveTimeRange.to).getTime(),
    ]);
  }, [effectiveTimeRange.from, effectiveTimeRange.to]);

  const sparkPlotData = useSparkplotDataFromSigEvents({
    previewFetch,
    query,
    xFormatter,
  });

  const firingCount = previewFetch.value?.firing_count;
  const isStatsPreview = firingCount !== undefined;
  const hasTimeseriesData = sparkPlotData.timeseries.some((point) => point.y > 0);
  const noOccurrencesFound = !hasTimeseriesData;

  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const useUrl = share.url.locators.useUrl;

  const discoverEsqlQuery = query.esql.query;

  const discoverLink = useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: {
        query: {
          esql: discoverEsqlQuery,
        },
      },
    }),
    [discoverEsqlQuery]
  );

  function renderContent() {
    if (isQueryValid === false) {
      return (
        <>
          <AssetImage type="barChart" size="xs" />
          <EuiText color="subdued" size="s" textAlign="center">
            {i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartPrompt',
              {
                defaultMessage: 'Preview will appear here',
              }
            )}
          </EuiText>
        </>
      );
    }

    if (previewFetch.loading) {
      return <EuiLoadingSpinner size="m" />;
    }

    if (previewFetch.error) {
      if (compressed) {
        return <EuiIcon type="cross" color="danger" size="l" aria-hidden={true} />;
      }

      return (
        <>
          <EuiIcon type="cross" color="danger" size="xl" aria-hidden={true} />
          <EuiText size="s" textAlign="center">
            {i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartError',
              {
                defaultMessage: 'Failed to load preview data',
              }
            )}
          </EuiText>
        </>
      );
    }

    if (noOccurrencesFound && isStatsPreview && firingCount > 0) {
      if (compressed) {
        return (
          <EuiBadge color="hollow">
            {i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.previewFiringCountCompressed',
              {
                defaultMessage:
                  '{count, plural, one {# threshold breach} other {# threshold breaches}}',
                values: { count: firingCount },
              }
            )}
          </EuiBadge>
        );
      }

      return (
        <>
          <EuiBadge color="hollow">
            {i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.previewFiringCountNoChart',
              {
                defaultMessage:
                  '{count, plural, one {# bucket exceeded threshold} other {# buckets exceeded threshold}}',
                values: { count: firingCount },
              }
            )}
          </EuiBadge>
          <EuiText color="subdued" size="s" textAlign="center">
            {i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.previewNoTemporalData',
              {
                defaultMessage: 'No temporal data available for chart',
              }
            )}
          </EuiText>
        </>
      );
    }

    if (noOccurrencesFound) {
      if (compressed) {
        return (
          <EuiIcon type="chartLine" color={euiTheme.colors.disabled} size="l" aria-hidden={true} />
        );
      }

      return (
        <>
          <AssetImage type="barChart" size="xs" />
          <EuiText color="subdued" size="s" textAlign="center">
            {i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartNoData',
              {
                defaultMessage: 'No events found, make sure to review your query',
              }
            )}
          </EuiText>
        </>
      );
    }

    const openInDiscoverLabel = i18n.translate(
      'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartOpenInDiscover',
      { defaultMessage: 'Open in Discover' }
    );

    const titleLabel = isStatsPreview
      ? i18n.translate(
          'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartThresholdBreaches',
          {
            defaultMessage: 'Threshold breaches ({count})',
            values: {
              count: sparkPlotData.timeseries.reduce((acc, point) => acc + point.y, 0),
            },
          }
        )
      : i18n.translate(
          'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartDetectedOccurrences',
          {
            defaultMessage: 'Detected event occurrences ({count})',
            values: {
              count: sparkPlotData.timeseries.reduce((acc, point) => acc + point.y, 0),
            },
          }
        );

    return (
      <>
        {showTitle && (
          <EuiFlexGroup justifyContent="spaceBetween" css={{ width: '100%' }}>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText css={{ fontWeight: euiTheme.font.weight.semiBold }}>
                    {titleLabel}
                  </EuiText>
                </EuiFlexItem>
                {isStatsPreview && firingCount > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {i18n.translate(
                        'xpack.streams.addSignificantEventFlyout.manualFlow.previewFiringCount',
                        {
                          defaultMessage:
                            '{count, plural, one {# bucket exceeded threshold} other {# buckets exceeded threshold}}',
                          values: { count: firingCount },
                        }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                aria-label={openInDiscoverLabel}
                iconType="discoverApp"
                href={discoverLink}
                target="_blank"
                data-test-subj="significant_events_preview_open_in_discover_button"
              >
                {openInDiscoverLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <SparkPlot
          id="query_preview"
          name={i18n.translate(
            'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartSeriesName',
            { defaultMessage: 'Occurrences' }
          )}
          type="bar"
          timeseries={sparkPlotData.timeseries}
          annotations={sparkPlotData.annotations}
          xFormatter={xFormatter}
          compressed={compressed}
          hideAxis={hideAxis}
          height={height}
        />
      </>
    );
  }

  return (
    <EuiPanel
      hasBorder={!compressed}
      hasShadow={false}
      css={{ height: height ? height : '200px' }}
      paddingSize={compressed ? 'none' : 'm'}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        alignItems="center"
        justifyContent="center"
        css={{ height: '100%' }}
      >
        {renderContent()}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
