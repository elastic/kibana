/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPagination,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { type RefreshInterval } from '@kbn/data-plugin/common';
import {
  type SelectedChangePoint,
  useChangePointDetectionContext,
} from './change_point_detection_context';
import { ChartComponent } from './chart_component';

const CHARTS_PER_PAGE = 6;

interface ChartsGridProps {
  changePoints: Record<number, SelectedChangePoint[]>;
}

/**
 * Shared component for change point charts grid.
 * Used both in AIOps UI and inside embeddable.
 *
 * @param changePoints
 * @constructor
 */
export const ChartsGrid: FC<{
  changePoints: SelectedChangePoint[];
  interval: string;
  onRenderComplete?: () => void;
}> = ({ changePoints, interval, onRenderComplete }) => {
  // Render is complete when all chart components in the grid are ready
  const loadCounter = useRef<Record<number, boolean>>(
    Object.fromEntries(changePoints.map((v, i) => [i, true]))
  );

  /**
   * Callback to track render of each chart component
   * to report when all charts are ready.
   */
  const onChartRenderCompleteCallback = useCallback(
    (chartId: number, isLoading: boolean) => {
      if (!onRenderComplete) return;
      loadCounter.current[chartId] = isLoading;
      const isLoadComplete = Object.values(loadCounter.current).every((v) => !v);
      if (isLoadComplete) {
        onRenderComplete();
      }
    },
    [onRenderComplete]
  );

  return (
    <EuiFlexGrid
      columns={changePoints.length >= 2 ? 2 : 1}
      responsive
      gutterSize={'m'}
      css={{ width: '100%' }}
    >
      {changePoints.map((v, index) => {
        const key = `${index}_${v.group?.value ?? 'single_metric'}_${v.fn}_${v.metricField}_${
          v.timestamp
        }_${v.p_value}`;
        return (
          <EuiFlexItem key={key}>
            <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
              <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'} gutterSize={'s'}>
                <EuiFlexItem grow={false}>
                  {v.group ? (
                    <EuiDescriptionList
                      type="inline"
                      listItems={[{ title: v.group.name, description: v.group.value }]}
                    />
                  ) : null}

                  {v.reason ? (
                    <EuiToolTip position="top" content={v.reason}>
                      <EuiIcon
                        tabIndex={0}
                        color={'warning'}
                        type="warning"
                        title={i18n.translate(
                          'xpack.aiops.changePointDetection.notResultsWarning',
                          {
                            defaultMessage: 'No change point agg results warning',
                          }
                        )}
                      />
                    </EuiToolTip>
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color={'subdued'} size={'s'}>
                    {v.fn}({v.metricField})
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiHorizontalRule margin="xs" />

              <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
                {v.p_value !== undefined ? (
                  <EuiFlexItem grow={false}>
                    <EuiDescriptionList
                      type="inline"
                      listItems={[
                        {
                          title: (
                            <FormattedMessage
                              id="xpack.aiops.changePointDetection.pValueLabel"
                              defaultMessage="p-value"
                            />
                          ),
                          description: v.p_value.toPrecision(3),
                        },
                      ]}
                    />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{v.type}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>

              <ChartComponent
                fieldConfig={{ splitField: v.splitField, fn: v.fn, metricField: v.metricField }}
                annotation={v}
                interval={interval}
                onLoading={(isLoading) => {
                  if (isLoading) {
                    onChartRenderCompleteCallback(index, true);
                  }
                }}
                onRenderComplete={() => {
                  onChartRenderCompleteCallback(index, false);
                }}
              />
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  );
};

/**
 * Wrapper component for change point charts grid.
 *
 * @param changePointsDict
 * @constructor
 */
export const ChartsGridContainer: FC<ChartsGridProps> = ({ changePoints: changePointsDict }) => {
  const timefilter = useTimefilter();

  const initialRefreshSetting = useRef<RefreshInterval>();

  const { bucketInterval } = useChangePointDetectionContext();

  useEffect(
    function pauseRefreshOnMount() {
      initialRefreshSetting.current = timefilter.getRefreshInterval();

      timefilter.setRefreshInterval({
        ...initialRefreshSetting.current,
        pause: true,
      });
      return () => {
        if (initialRefreshSetting.current) {
          // reset initial settings
          timefilter.setRefreshInterval(initialRefreshSetting.current);
        }
      };
    },
    [timefilter]
  );

  const changePoints = useMemo(() => {
    return Object.values(changePointsDict).flat();
  }, [changePointsDict]);

  const [activePage, setActivePage] = useState<number>(0);

  const resultPerPage = useMemo(() => {
    const start = activePage * CHARTS_PER_PAGE;
    return changePoints.slice(start, start + CHARTS_PER_PAGE);
  }, [changePoints, activePage]);

  const pagination = useMemo(() => {
    return {
      activePage,
      pageCount: Math.ceil((changePoints.length ?? 0) / CHARTS_PER_PAGE),
      updatePagination: setActivePage,
    };
  }, [activePage, changePoints.length]);

  return (
    <>
      <ChartsGrid changePoints={resultPerPage} interval={bucketInterval.expression} />

      {pagination.pageCount > 1 ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiPagination
              pageCount={pagination.pageCount}
              activePage={pagination.activePage}
              onPageClick={pagination.updatePagination}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
};
