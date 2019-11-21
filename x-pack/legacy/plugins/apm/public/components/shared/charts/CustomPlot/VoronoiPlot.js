/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { union } from 'lodash';
import { Voronoi } from 'react-vis';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

import { SharedPlot } from './plotUtils';

function getXValuesCombined(series) {
  return union(...series.map(serie => serie.data.map(p => p.x))).map(x => ({
    x
  }));
}

class VoronoiPlot extends PureComponent {
  render() {
    const { series, plotValues, noHits } = this.props;
    const { XY_MARGIN, XY_HEIGHT, XY_WIDTH, x } = plotValues;
    const xValuesCombined = getXValuesCombined(series);
    if (!xValuesCombined || noHits) {
      return null;
    }

    return (
      <SharedPlot
        plotValues={plotValues}
        onMouseLeave={this.props.onMouseLeave}
      >
        <Voronoi
          extent={[
            [XY_MARGIN.left, XY_MARGIN.top],
            [XY_WIDTH, XY_HEIGHT]
          ]}
          nodes={xValuesCombined}
          onHover={this.props.onHover}
          onMouseDown={this.props.onMouseDown}
          onMouseUp={this.props.onMouseUp}
          x={d => x(d.x)}
          y={() => 0}
        />
      </SharedPlot>
    );
  }
}

export default VoronoiPlot;

VoronoiPlot.propTypes = {
  noHits: PropTypes.bool.isRequired,
  onHover: PropTypes.func.isRequired,
  onMouseDown: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
  onMouseUp: PropTypes.func,
  series: PropTypes.array.isRequired,
  plotValues: PropTypes.object.isRequired
};
