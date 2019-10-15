/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { useRef, FC } from 'react';
import { TooltipValueFormatter } from '@elastic/charts';

// TODO: Below import is temporary, use `react-use` lib instead.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useObservable } from '../../../../../../../src/plugins/kibana_react/public/util/use_observable';

import { chartTooltip$, mlChartTooltipService, ChartTooltipValue } from './chart_tooltip_service';

const renderHeader = (headerData?: ChartTooltipValue, formatter?: TooltipValueFormatter) => {
  if (!headerData) {
    return null;
  }

  return formatter ? formatter(headerData) : headerData.name;
};

export const ChartTooltip: FC = () => {
  const chartTooltipElement = useRef(null);

  mlChartTooltipService.element = chartTooltipElement.current;

  const chartTooltipState = useObservable(chartTooltip$);

  if (chartTooltipState === undefined || !chartTooltipState.isTooltipVisible) {
    return <div className="mlChartTooltip mlChartTooltip--hidden" ref={chartTooltipElement} />;
  }

  const { tooltipData, tooltipHeaderFormatter, tooltipPosition } = chartTooltipState;

  return (
    <div
      className="mlChartTooltip"
      style={{ transform: tooltipPosition.transform }}
      ref={chartTooltipElement}
    >
      {tooltipData.length > 0 && tooltipData[0].skipHeader === undefined && (
        <div className="mlChartTooltip__header">
          {renderHeader(tooltipData[0], tooltipHeaderFormatter)}
        </div>
      )}
      {tooltipData.length > 1 && (
        <div className="mlChartTooltip__list">
          {tooltipData
            .slice(1)
            .map(({ name, value, color, isHighlighted, seriesKey, yAccessor }) => {
              const classes = classNames('mlChartTooltip__item', {
                /* eslint @typescript-eslint/camelcase:0 */
                echTooltip__rowHighlighted: isHighlighted,
              });
              return (
                <div
                  key={`${seriesKey}--${yAccessor}`}
                  className={classes}
                  style={{
                    borderLeftColor: color,
                  }}
                >
                  <span className="mlChartTooltip__label">{name}</span>
                  <span className="mlChartTooltip__value">{value}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
