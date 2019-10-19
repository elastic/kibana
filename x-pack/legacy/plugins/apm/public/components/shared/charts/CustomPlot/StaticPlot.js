/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  XAxis,
  YAxis,
  HorizontalGridLines,
  LineSeries,
  LineMarkSeries,
  AreaSeries,
  VerticalRectSeries
} from 'react-vis';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { last } from 'lodash';
import { rgba } from 'polished';

import StatusText from './StatusText';
import { SharedPlot } from './plotUtils';
import { i18n } from '@kbn/i18n';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';

// undefined values are converted by react-vis into NaN when stacking
// see https://github.com/uber/react-vis/issues/1214
const getNull = d => isValidCoordinateValue(d.y) && !isNaN(d.y);

class StaticPlot extends PureComponent {
  getVisSeries(series, plotValues) {
    return series
      .slice()
      .reverse()
      .map(serie => this.getSerie(serie, plotValues));
  }

  getSerie(serie, plotValues) {
    switch (serie.type) {
      case 'line':
        return (
          <LineSeries
            getNull={getNull}
            key={serie.title}
            xType="time"
            curve={'curveMonotoneX'}
            data={serie.data}
            color={serie.color}
            stack={serie.stack}
          />
        );
      case 'area':
        return (
          <AreaSeries
            getNull={getNull}
            key={serie.title}
            xType="time"
            curve={'curveMonotoneX'}
            data={serie.data}
            color={serie.color}
            stroke={serie.color}
            fill={serie.areaColor || rgba(serie.color, 0.3)}
          />
        );

      case 'areaStacked': {
        // convert null into undefined because of stack issues,
        // see https://github.com/uber/react-vis/issues/1214
        const data = serie.data.map(value => {
          return 'y' in value && isValidCoordinateValue(value.y)
            ? value
            : {
                ...value,
                y: undefined
              };
        });
        return [
          <AreaSeries
            getNull={getNull}
            key={`${serie.title}-area`}
            xType="time"
            curve={'curveMonotoneX'}
            data={data}
            color={serie.color}
            stroke={'rgba(0,0,0,0)'}
            fill={serie.areaColor || rgba(serie.color, 0.3)}
            stack={true}
            cluster="area"
          />,
          <LineSeries
            getNull={getNull}
            key={`${serie.title}-line`}
            xType="time"
            curve={'curveMonotoneX'}
            data={data}
            color={serie.color}
            stack={true}
            cluster="line"
          />
        ];
      }

      case 'areaMaxHeight':
        const yMax = last(plotValues.yTickValues);
        const data = serie.data.map(p => ({
          x0: p.x0,
          x: p.x,
          y0: 0,
          y: yMax
        }));

        return (
          <VerticalRectSeries
            getNull={getNull}
            key={serie.title}
            xType="time"
            curve={'curveMonotoneX'}
            data={data}
            color={serie.color}
            stroke={serie.color}
            fill={serie.areaColor}
          />
        );
      case 'linemark':
        return (
          <LineMarkSeries
            getNull={getNull}
            key={serie.title}
            xType="time"
            curve={'curveMonotoneX'}
            data={serie.data}
            color={serie.color}
            size={0.5}
          />
        );
      default:
        throw new Error(`Unknown type ${serie.type}`);
    }
  }

  render() {
    const {
      width,
      series,
      tickFormatX,
      tickFormatY,
      plotValues,
      noHits
    } = this.props;
    const { yTickValues } = plotValues;

    // approximate number of x-axis ticks based on the width of the plot. There should by approx 1 tick per 100px
    // d3 will determine the exact number of ticks based on the selected range
    const xTickTotal = Math.floor(width / 100);

    return (
      <SharedPlot plotValues={plotValues}>
        <XAxis tickSize={0} tickTotal={xTickTotal} tickFormat={tickFormatX} />
        {noHits ? (
          <StatusText
            marginLeft={30}
            text={i18n.translate('xpack.apm.metrics.plot.noDataLabel', {
              defaultMessage: 'No data within this time range.'
            })}
          />
        ) : (
          [
            <HorizontalGridLines key="grid-lines" tickValues={yTickValues} />,
            <YAxis
              key="y-axis"
              tickSize={0}
              tickValues={yTickValues}
              tickFormat={tickFormatY}
              style={{
                line: { stroke: 'none', fill: 'none' }
              }}
            />,
            this.getVisSeries(series, plotValues)
          ]
        )}
      </SharedPlot>
    );
  }
}

export default StaticPlot;

StaticPlot.propTypes = {
  noHits: PropTypes.bool.isRequired,
  series: PropTypes.array.isRequired,
  plotValues: PropTypes.object.isRequired,
  tickFormatX: PropTypes.func,
  tickFormatY: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired
};
