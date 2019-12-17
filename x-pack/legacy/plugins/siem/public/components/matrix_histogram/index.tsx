/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ScaleType } from '@elastic/charts';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { EuiLoadingContent } from '@elastic/eui';
import { BarChart } from '../charts/barchart';
import { HeaderSection } from '../header_section';
import { ChartSeriesData } from '../charts/common';
import { DEFAULT_DARK_MODE } from '../../../common/constants';
import { useUiSetting$ } from '../../lib/kibana';
import { Loader } from '../loader';
import { Panel } from '../panel';
import { getBarchartConfigs, getCustomChartData } from './utils';
import { MatrixHistogramProps, MatrixHistogramDataTypes } from './types';

export const MatrixHistogram = ({
  data,
  dataKey,
  endDate,
  id,
  loading,
  mapping,
  scaleType = ScaleType.Time,
  startDate,
  subtitle,
  title,
  totalCount,
  updateDateRange,
  yTickFormatter,
  showLegend,
}: MatrixHistogramProps<MatrixHistogramDataTypes>) => {
  const barchartConfigs = getBarchartConfigs({
    from: startDate,
    to: endDate,
    onBrushEnd: updateDateRange,
    scaleType,
    yTickFormatter,
    showLegend,
  });
  const [showInspect, setShowInspect] = useState(false);
  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const barChartData: ChartSeriesData[] = getCustomChartData(data, mapping);

  useEffect(() => {
    if (totalCount >= 0 && loadingInitial) {
      setLoadingInitial(false);
    }
  }, [loading, loadingInitial, totalCount]);

  const handleOnMouseEnter = useCallback(() => setShowInspect(true), []);
  const handleOnMouseLeave = useCallback(() => setShowInspect(false), []);

  return (
    <Panel
      data-test-subj={`${dataKey}Panel`}
      loading={loading}
      onMouseEnter={handleOnMouseEnter}
      onMouseLeave={handleOnMouseLeave}
    >
      <HeaderSection
        id={id}
        title={title}
        showInspect={!loadingInitial && showInspect}
        subtitle={!loadingInitial && subtitle}
      />

      {loadingInitial ? (
        <EuiLoadingContent data-test-subj="initialLoadingPanelMatrixOverTime" lines={10} />
      ) : (
        <>
          <BarChart barChart={barChartData} configs={barchartConfigs} />

          {loading && (
            <Loader
              overlay
              overlayBackground={
                darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
              }
              size="xl"
            />
          )}
        </>
      )}
    </Panel>
  );
};
