/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import $ from 'plugins/xpack_main/jquery_flot';
import { eventBus } from './event_bus';
import { getChartOptions } from './get_chart_options';

export class ChartTarget extends React.Component {
  shouldComponentUpdate() {
    return !this.plot;
  }

  shutdownChart() {
    if (!this.plot) {
      return;
    }

    const { target } = this.refs;
    $(target).off('plothover');
    $(target).off('mouseleave');
    $(target).off('plotselected');
    $(target).off('plotselecting');

    this.plot.shutdown();

    eventBus.off('thorPlotHover');
    eventBus.off('thorPlotLeave');
    eventBus.off('thorPlotSelecting');
    eventBus.off('thorPlotBrush');
  }

  componentWillUnmount() {
    this.shutdownChart();
    window.removeEventListener('resize', this._handleResize);
    this.componentUnmounted = true;
  }

  filterByShow(seriesToShow) {
    if (seriesToShow) {
      return metric => {
        return seriesToShow.some(id => id.toLowerCase() === metric.id.toLowerCase());
      };
    }
    return _metric => true;
  }

  componentWillReceiveProps(newProps) {
    if (this.plot && !_.isEqual(newProps, this.props)) {
      const { series, timeRange } = newProps;

      const xaxisOptions = this.plot.getAxes().xaxis.options;
      xaxisOptions.min = _.get(timeRange, 'min');
      xaxisOptions.max = _.get(timeRange, 'max');

      this.plot.setData(this.filterData(series, newProps.seriesToShow));
      this.plot.setupGrid();
      this.plot.draw();
    }
  }

  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate() {
    this.shutdownChart();
    this.renderChart();
  }

  filterData(data, seriesToShow) {
    return _(data)
      .filter(this.filterByShow(seriesToShow))
      .value();
  }

  async getOptions() {
    const opts = await getChartOptions({
      yaxis: { tickFormatter: this.props.tickFormatter },
      xaxis: this.props.timeRange,
    });

    return {
      ...opts,
      ...this.props.options,
    };
  }

  async renderChart() {
    const { target } = this.refs;
    const { series } = this.props;
    const data = this.filterData(series, this.props.seriesToShow);

    this.plot = $.plot(target, data, await this.getOptions());
    if (this.componentUnmounted || !this.plot) {
      return;
    }

    this._handleResize = () => {
      if (!this.plot) {
        return;
      }

      try {
        this.plot.resize();
        this.plot.setupGrid();
        this.plot.draw();
      } catch (e) {
        // eslint-disable-line no-empty
        /* It is ok to silently swallow the error here. Resize events fire
         * continuously so the proper resize will happen in a later firing of
         * the event */
      }
    };

    window.addEventListener('resize', this._handleResize, false);

    this.handleMouseLeave = () => {
      eventBus.trigger('thorPlotLeave', []);
    };

    this.handlePlotHover = (_event, pos, item) => {
      eventBus.trigger('thorPlotHover', [pos, item, this.plot]);
    };

    this.handleThorPlotHover = (_event, pos, item, originalPlot) => {
      if (this.plot !== originalPlot) {
        // the crosshair is set for the original chart already
        this.plot.setCrosshair({ x: _.get(pos, 'x') });
      }
      this.props.updateLegend(pos, item);
    };

    this.handleThorPlotLeave = () => {
      this.plot.clearCrosshair();
      this.props.updateLegend(); // gets last values
    };

    this.handleThorPlotSelecting = (_event, xaxis, originalPlot) => {
      if (this.plot !== originalPlot) {
        const preventEvent = true;
        this.plot.setSelection({ xaxis }, preventEvent);
      }
    };

    this.handleThorPlotBrush = () => {
      this.plot.clearSelection();
    };

    this.selectingChart = (_event, ranges) => {
      if (ranges) {
        const xaxis = ranges.xaxis;
        eventBus.trigger('thorPlotSelecting', [xaxis, this.plot]);
      }
    };

    this.brushChart = (_event, ranges) => {
      this.props.onBrush(ranges);
      eventBus.trigger('thorPlotBrush');
    };

    $(target).on('plothover', this.handlePlotHover);
    $(target).on('mouseleave', this.handleMouseLeave);
    $(target).on('plotselected', this.brushChart);
    $(target).on('plotselecting', this.selectingChart);

    eventBus.on('thorPlotHover', this.handleThorPlotHover);
    eventBus.on('thorPlotLeave', this.handleThorPlotLeave);
    eventBus.on('thorPlotSelecting', this.handleThorPlotSelecting);
    eventBus.on('thorPlotBrush', this.handleThorPlotBrush);
  }

  render() {
    const style = {
      position: 'relative',
      display: 'flex',
      rowDirection: 'column',
      flex: '1 0 auto',
    };

    return <div ref="target" style={style} />;
  }
}
