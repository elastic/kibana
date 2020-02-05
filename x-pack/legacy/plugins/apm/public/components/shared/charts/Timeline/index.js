/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { makeWidthFlexible } from 'react-vis';
import { getPlotValues } from './plotUtils';
import TimelineAxis from './TimelineAxis';
import VerticalLines from './VerticalLines';

class Timeline extends PureComponent {
  render() {
    const { width, duration, marks, height, margins } = this.props;
    if (duration == null || !width) {
      return null;
    }
    const plotValues = getPlotValues({ width, duration, height, margins });

    return (
      <div>
        <TimelineAxis
          plotValues={plotValues}
          marks={marks}
          topTraceDuration={duration}
        />
        <VerticalLines
          plotValues={plotValues}
          marks={marks}
          topTraceDuration={duration}
        />
      </div>
    );
  }
}

Timeline.propTypes = {
  marks: PropTypes.array,
  duration: PropTypes.number,
  height: PropTypes.number.isRequired,
  header: PropTypes.node,
  margins: PropTypes.object.isRequired,
  width: PropTypes.number
};

export default makeWidthFlexible(Timeline);
