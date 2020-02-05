/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { SharedPlot } from './plotUtils';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import SelectionMarker from './SelectionMarker';

import { MarkSeries, VerticalGridLines } from 'react-vis';
import Tooltip from '../Tooltip';

function getPointByX(serie, x) {
  return serie.data.find(point => point.x === x);
}

class InteractivePlot extends PureComponent {
  getMarkPoints = hoverX => {
    return (
      this.props.series
        .filter(serie =>
          serie.data.some(point => point.x === hoverX && point.y != null)
        )
        .map(serie => {
          const { x, y } = getPointByX(serie, hoverX) || {};
          return {
            x,
            y,
            color: serie.color
          };
        })
        // needs to be reversed, as StaticPlot.js does the same
        .reverse()
    );
  };

  getTooltipPoints = hoverX => {
    return this.props.series
      .filter(series => !series.hideTooltipValue)
      .map(serie => {
        const point = getPointByX(serie, hoverX) || {};
        return {
          color: serie.color,
          value: this.props.formatTooltipValue(point),
          text: serie.titleShort || serie.title
        };
      });
  };

  render() {
    const {
      plotValues,
      hoverX,
      series,
      isDrawing,
      selectionStart,
      selectionEnd
    } = this.props;

    if (isEmpty(series)) {
      return null;
    }

    const tooltipPoints = this.getTooltipPoints(hoverX);
    const markPoints = this.getMarkPoints(hoverX);
    const { x, xTickValues, yTickValues } = plotValues;
    const yValueMiddle = yTickValues[1];

    if (isEmpty(xTickValues)) {
      return <SharedPlot plotValues={plotValues} />;
    }

    return (
      <SharedPlot plotValues={plotValues}>
        {hoverX && (
          <Tooltip tooltipPoints={tooltipPoints} x={hoverX} y={yValueMiddle} />
        )}

        {hoverX && <MarkSeries data={markPoints} colorType="literal" />}
        {hoverX && <VerticalGridLines tickValues={[hoverX]} />}

        {isDrawing && selectionEnd !== null && (
          <SelectionMarker start={x(selectionStart)} end={x(selectionEnd)} />
        )}
      </SharedPlot>
    );
  }
}

InteractivePlot.propTypes = {
  formatTooltipValue: PropTypes.func.isRequired,
  hoverX: PropTypes.number,
  isDrawing: PropTypes.bool.isRequired,
  plotValues: PropTypes.object.isRequired,
  selectionEnd: PropTypes.number,
  selectionStart: PropTypes.number,
  series: PropTypes.array.isRequired
};

export default InteractivePlot;
