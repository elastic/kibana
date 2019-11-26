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
import { useObservable } from '../../../../../../../../src/plugins/kibana_react/public/util/use_observable';

import { chartTooltip$, ChartTooltipValue } from './chart_tooltip_service';

type RefValue = HTMLElement | null;

function useRefWithCallback() {
  const chartTooltipState = useObservable(chartTooltip$);
  const ref = useRef<RefValue>(null);

  return (node: RefValue) => {
    ref.current = node;

    if (
      node !== null &&
      node.parentElement !== null &&
      chartTooltipState !== undefined &&
      chartTooltipState.isTooltipVisible
    ) {
      const parentBounding = node.parentElement.getBoundingClientRect();

      const { targetPosition, offset } = chartTooltipState;

      const contentWidth = document.body.clientWidth - parentBounding.left;
      const tooltipWidth = node.clientWidth;

      let left = targetPosition.left + offset.x - parentBounding.left;
      if (left + tooltipWidth > contentWidth) {
        // the tooltip is hanging off the side of the page,
        // so move it to the other side of the target
        const markerWidthAdjustment = 25;
        left = left - (tooltipWidth + offset.x + markerWidthAdjustment);
      }

      const top = targetPosition.top + offset.y - parentBounding.top;

      if (
        chartTooltipState.tooltipPosition.left !== left ||
        chartTooltipState.tooltipPosition.top !== top
      ) {
        // render the tooltip with adjusted position.
        chartTooltip$.next({
          ...chartTooltipState,
          tooltipPosition: { left, top },
        });
      }
    }
  };
}

const renderHeader = (headerData?: ChartTooltipValue, formatter?: TooltipValueFormatter) => {
  if (!headerData) {
    return null;
  }

  return formatter ? formatter(headerData) : headerData.name;
};

export const ChartTooltip: FC = () => {
  const chartTooltipState = useObservable(chartTooltip$);
  const chartTooltipElement = useRefWithCallback();

  if (chartTooltipState === undefined || !chartTooltipState.isTooltipVisible) {
    return <div className="mlChartTooltip mlChartTooltip--hidden" ref={chartTooltipElement} />;
  }

  const { tooltipData, tooltipHeaderFormatter, tooltipPosition } = chartTooltipState;
  const transform = `translate(${tooltipPosition.left}px, ${tooltipPosition.top}px)`;

  return (
    <div className="mlChartTooltip" style={{ transform }} ref={chartTooltipElement}>
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
