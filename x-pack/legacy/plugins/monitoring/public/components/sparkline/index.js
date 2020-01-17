/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { SparklineFlotChart } from './sparkline_flot_chart';

export class Sparkline extends React.Component {
  constructor(props) {
    super(props);
    this.makeSparklineFlotChart = this.makeSparklineFlotChart.bind(this);
    this.onHover = this.onHover.bind(this);
    this.renderTooltip = this.renderTooltip.bind(this);
    this.handleSparklineRef = this.handleSparklineRef.bind(this);

    this.state = {
      tooltip: undefined,
    };
  }

  UNSAFE_componentWillReceiveProps({ series, options }) {
    if (!isEqual(options, this.props.options)) {
      this.sparklineFlotChart.shutdown();
      this.makeSparklineFlotChart(options);
    }

    if (!isEqual(series, this.props.series)) {
      this.sparklineFlotChart.update(series);
    }
  }

  makeSparklineFlotChart(overrideFlotOptions) {
    this.sparklineFlotChart = new SparklineFlotChart(
      this.chartElem,
      this.props.series,
      this.props.onBrush,
      this.onHover,
      overrideFlotOptions
    );
  }

  onHover(dataPoint) {
    this.setState({
      tooltip: dataPoint,
    });
  }

  renderTooltip() {
    if (this.props.tooltip.enabled === false) {
      return;
    }

    if (!this.state.tooltip) {
      return;
    }

    const tooltipHeightInPx = 36;
    const tooltipWidthInPx = 220;
    const caretWidthInPx = 6;
    const marginBetweenPointAndCaretInPx = 10;

    const styles = {
      tooltipContainer: {
        top: this.state.tooltip.yPosition - tooltipHeightInPx / 2,
      },
      tooltip: {
        height: tooltipHeightInPx,
        width: tooltipWidthInPx,
      },
      leftCaret: {
        width: caretWidthInPx,
      },
      rightCaret: {
        width: caretWidthInPx,
      },
    };

    const plotMiddleX = this.state.tooltip.plotLeft + this.state.tooltip.plotWidth / 2;
    const tooltipContainerWidthInPx = tooltipWidthInPx + caretWidthInPx;
    if (this.state.tooltip.xPosition > plotMiddleX) {
      // The point is in the right half of the plot; position the tooltip
      // to the left of the point
      styles.rightCaret.display = 'block';
      styles.tooltipContainer.left =
        this.state.tooltip.xPosition - tooltipContainerWidthInPx - marginBetweenPointAndCaretInPx;
    } else {
      // The point is in the left half of the plot; position the tooltip
      // to the right of the point
      styles.leftCaret.display = 'block';
      styles.tooltipContainer.left = this.state.tooltip.xPosition + marginBetweenPointAndCaretInPx;
    }

    return (
      <div className="monSparklineTooltip__container" style={styles.tooltipContainer}>
        <i className="fa fa-caret-left monSparklineTooltip__caret" style={styles.leftCaret} />
        <div className="monSparklineTooltip" style={styles.tooltip}>
          <div className="monSparklineTooltip__yValue">
            {this.props.tooltip.yValueFormatter(this.state.tooltip.yValue)}
          </div>
          <div className="monSparklineTooltip__xValue">
            {this.props.tooltip.xValueFormatter(this.state.tooltip.xValue)}
          </div>
        </div>
        <i className="fa fa-caret-right monSparklineTooltip__caret" style={styles.rightCaret} />
      </div>
    );
  }

  handleSparklineRef(elem) {
    this.chartElem = elem;
    if (this.chartElem) {
      this.makeSparklineFlotChart(this.props.options);
    } else if (this.sparklineFlotChart) {
      this.sparklineFlotChart.shutdown();
    }
  }

  render() {
    return (
      <div>
        <div className="monSparkline" ref={this.handleSparklineRef} />
        {this.renderTooltip()}
      </div>
    );
  }
}

Sparkline.propTypes = {
  series: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  tooltip: PropTypes.shape({
    enabled: PropTypes.bool,
    xValueFormatter: PropTypes.func,
    yValueFormatter: PropTypes.func,
  }),
  options: PropTypes.shape({
    xaxis: PropTypes.shape({
      min: PropTypes.number,
      max: PropTypes.number,
    }),
  }),
};
