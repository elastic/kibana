/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';
import { EuiToolTip } from '@elastic/eui';
import { useTimerangeBarStyles } from './timerange_bar_styles';
export function TimeRangeBar({ isRunning, timerange, ganttBarWidth }) {
  const styles = useTimerangeBarStyles();

  const style = {
    width: timerange.widthPx,
    marginLeft: timerange.fromPx,
  };

  return (
    <EuiToolTip position="top" content={timerange.label}>
      <Fragment>
        <div css={styles.ganttBarBackEdge}>
          <div css={styles.ganttBarDashed} style={{ width: `${ganttBarWidth}px` }} />
        </div>
        <div
          css={[styles.ganttBar, ...(isRunning ? [styles.ganttBarRunning] : [])]}
          style={style}
          data-test-subj={`mlJobSelectorGanttBar${isRunning ? 'Running' : ''}`}
        />
      </Fragment>
    </EuiToolTip>
  );
}

TimeRangeBar.propTypes = {
  ganttBarWidth: PropTypes.number,
  isRunning: PropTypes.bool,
  timerange: PropTypes.shape({
    widthPx: PropTypes.number,
    label: PropTypes.string,
    fromPx: PropTypes.number,
  }),
};
