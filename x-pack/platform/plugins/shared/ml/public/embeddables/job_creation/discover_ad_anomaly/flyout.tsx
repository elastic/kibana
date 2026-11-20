/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiResizeObserver,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { TimeBuckets } from '@kbn/ml-time-buckets';
import { ML_APP_LOCATOR } from '@kbn/ml-common-types/locator_app_locator';
import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import { useMlKibana } from '../../../application/contexts/kibana';
import { ExplorerAnomaliesContainer } from '../../../application/explorer/explorer_charts/explorer_anomalies_container';
import { AnomaliesTable } from '../../../application/components/anomalies_table/anomalies_table';
import { useDefaultSeverity } from '../../../application/components/controls/select_severity/select_severity';
import { AiSummary } from './ai_summary';
import { useAnomalyData } from './use_anomaly_data';

const TITLE_ID = 'mlDiscoverADAnomalyFlyoutTitle';
const CHART_ID = 'mlDiscoverADAnomalyCharts';
// The width changes while the flyout is resized, which is not worth drawing the charts again for
const MIN_WIDTH_CHANGE_PX = 20;
// Narrower than this, the columns of the anomalies table are squashed
const TABLE_MIN_WIDTH = 1000;

interface Props {
  jobId: string;
  /** The start of the time range of the anomaly, in epoch ms */
  timestamp: number;
  /** The end of the time range of the anomaly, in epoch ms */
  endTimestamp: number;
  /** The anomaly score (0-100) */
  score: number;
  /** Whether AI is available, for the sections which use it */
  isAiAvailable?: boolean;
}

const noop = () => {};

export const DiscoverADAnomalyFlyout: FC<Props> = ({
  jobId,
  timestamp,
  endTimestamp,
  isAiAvailable = false,
}) => {
  const {
    services: {
      uiSettings,
      share,
      charts,
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();
  // The data is loaded for the first width, and drawn again at the width the flyout or browser is resized to
  const [loadWidth, setLoadWidth] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);
  // As the Anomaly Explorer's table and charts default to
  const { val: severity } = useDefaultSeverity();
  const { isLoading, error, jobs, tableData, chartsData } = useAnomalyData({
    jobId,
    timestamp,
    endTimestamp,
    chartWidth: loadWidth,
    severity,
  });

  const mlLocator = useMemo(() => share.url.locators.get<MlLocatorParams>(ML_APP_LOCATOR), [share]);
  const timeBuckets = useMemo(
    () =>
      new TimeBuckets({
        'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
        'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
        dateFormat: uiSettings.get('dateFormat'),
        'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
      }),
    [uiSettings]
  );

  const onResize = useCallback(({ width }: { width: number }) => {
    setLoadWidth((current) => current || Math.floor(width));
    setChartWidth((current) =>
      current === 0 || Math.abs(current - width) > MIN_WIDTH_CHANGE_PX ? Math.floor(width) : current
    );
  }, []);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={TITLE_ID} data-test-subj="mlDiscoverADAnomalyFlyoutTitle">
            {i18n.translate('xpack.ml.discoverADAnomalyFlyout.title', {
              defaultMessage: 'Anomaly',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiResizeObserver onResize={onResize}>
          {(resizeRef) => (
            <div ref={resizeRef} data-test-subj="mlDiscoverADAnomalyFlyoutContent">
              {isAiAvailable && !isLoading ? (
                <>
                  <AiSummary jobId={jobId} timestamp={timestamp} endTimestamp={endTimestamp} />
                  <EuiSpacer size="m" />
                </>
              ) : null}
              {error ? (
                <KbnDangerCallout
                  announceOnMount
                  title={i18n.translate('xpack.ml.discoverADAnomalyFlyout.loadError', {
                    defaultMessage: 'The anomalies could not be loaded',
                  })}
                  text={error}
                  data-test-subj="mlDiscoverADAnomalyError"
                />
              ) : (
                <EuiSkeletonLoading
                  isLoading={isLoading}
                  data-test-subj="mlDiscoverADAnomalyLoading"
                  loadingContent={
                    <>
                      <EuiSkeletonRectangle width="100%" height={200} borderRadius="m" />
                      <EuiSpacer size="m" />
                      <EuiSkeletonText lines={10} />
                    </>
                  }
                  loadedContent={
                    chartsData && tableData && jobs && mlLocator ? (
                      <>
                        <ExplorerAnomaliesContainer
                          // The charts are drawn at the width they have when mounted
                          key={chartWidth}
                          id={CHART_ID}
                          chartsData={chartsData}
                          showCharts
                          severity={severity}
                          setSeverity={noop}
                          mlLocator={mlLocator}
                          tableData={tableData}
                          timeBuckets={timeBuckets}
                          timefilter={timefilter}
                          onSelectEntity={noop}
                          chartsService={charts}
                          timeRange={undefined}
                          showFilterIcons={false}
                          isInteractive={false}
                          colorSelectedIntervalBySeverity
                        />
                        <EuiSpacer size="m" />
                        {/* The table is wider than the flyout, so it scrolls rather than squashing its columns */}
                        <div css={{ overflowX: 'auto' }} data-test-subj="mlDiscoverADAnomalyTable">
                          <div css={{ minWidth: TABLE_MIN_WIDTH }}>
                            <AnomaliesTable
                              bounds={timefilter.getBounds()}
                              tableData={tableData}
                              sourceIndicesWithGeoFields={{}}
                              selectedJobs={jobs}
                              telemetrySource="explorer_anomalies_table"
                            />
                          </div>
                        </div>
                      </>
                    ) : null
                  }
                />
              )}
            </div>
          )}
        </EuiResizeObserver>
      </EuiFlyoutBody>
    </>
  );
};
