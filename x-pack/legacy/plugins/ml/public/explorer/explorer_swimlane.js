/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React from 'react';

import _ from 'lodash';
import d3 from 'd3';
import moment from 'moment';

// don't use something like plugins/ml/../common
// because it won't work with the jest tests
import { formatHumanReadableDateTime } from '../util/date_utils';
import { numTicksForDateFormat } from '../util/chart_utils';
import { getSeverityColor } from '../../common/util/anomaly_utils';
import { mlEscape } from '../util/string_utils';
import { mlChartTooltipService } from '../components/chart_tooltip/chart_tooltip_service';
import { ALLOW_CELL_RANGE_SELECTION, dragSelect$ } from './explorer_dashboard_service';
import { DRAG_SELECT_ACTION } from './explorer_constants';
import { injectI18n } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const SCSS = {
  mlDragselectDragging: 'mlDragselectDragging',
  mlHideRangeSelection: 'mlHideRangeSelection'
};

export const ExplorerSwimlane = injectI18n(class ExplorerSwimlane extends React.Component {
  static propTypes = {
    chartWidth: PropTypes.number.isRequired,
    filterActive: PropTypes.bool,
    maskAll: PropTypes.bool,
    MlTimeBuckets: PropTypes.func.isRequired,
    swimlaneCellClick: PropTypes.func.isRequired,
    swimlaneData: PropTypes.shape({
      laneLabels: PropTypes.array.isRequired
    }).isRequired,
    swimlaneType: PropTypes.string.isRequired,
    selection: PropTypes.object,
    swimlaneRenderDoneListener: PropTypes.func.isRequired,
  }

  // Since this component is mostly rendered using d3 and cellMouseoverActive is only
  // relevant for d3 based interaction, we don't manage this using React's state
  // and intentionally circumvent the component lifecycle when updating it.
  cellMouseoverActive = true;

  dragSelectSubscriber = null;

  componentDidMount() {
    // property for data comparison to be able to filter
    // consecutive click events with the same data.
    let previousSelectedData = null;

    // Listen for dragSelect events
    this.dragSelectSubscriber = dragSelect$.subscribe(({ action, elements = [] }) => {
      const element = d3.select(this.rootNode.parentNode);
      const { swimlaneType } = this.props;

      if (action === DRAG_SELECT_ACTION.NEW_SELECTION && elements.length > 0) {
        const firstSelectedCell = d3.select(elements[0]).node().__clickData__;

        if (typeof firstSelectedCell !== 'undefined' && swimlaneType === firstSelectedCell.swimlaneType) {
          const selectedData = elements.reduce((d, e) => {
            const cell = d3.select(e).node().__clickData__;
            d.bucketScore = Math.max(d.bucketScore, cell.bucketScore);
            d.laneLabels.push(cell.laneLabel);
            d.times.push(cell.time);
            return d;
          }, {
            bucketScore: 0,
            laneLabels: [],
            times: []
          });

          selectedData.laneLabels = _.uniq(selectedData.laneLabels);
          selectedData.times = _.uniq(selectedData.times);
          if (_.isEqual(selectedData, previousSelectedData) === false) {
            this.selectCell(elements, selectedData);
            previousSelectedData = selectedData;
          }
        }

        this.cellMouseoverActive = true;
      } else if (action === DRAG_SELECT_ACTION.ELEMENT_SELECT) {
        element.classed(SCSS.mlDragselectDragging, true);
        return;
      } else if (action === DRAG_SELECT_ACTION.DRAG_START) {
        this.cellMouseoverActive = false;
        return;
      }

      previousSelectedData = null;
      element.classed(SCSS.mlDragselectDragging, false);
      elements.map(e => d3.select(e).classed('ds-selected', false));
    });

    this.renderSwimlane();
  }

  componentDidUpdate() {
    this.renderSwimlane();
  }

  componentWillUnmount() {
    if (this.dragSelectSubscriber !== null) {
      this.dragSelectSubscriber.unsubscribe();
    }
    const element = d3.select(this.rootNode);
    element.html('');
  }

  selectCell(cellsToSelect, { laneLabels, bucketScore, times }) {
    const {
      selection,
      swimlaneCellClick,
      swimlaneData,
      swimlaneType
    } = this.props;

    let triggerNewSelection = false;

    if (cellsToSelect.length > 1 || bucketScore > 0) {
      triggerNewSelection = true;
    }

    // Check if the same cells were selected again, if so clear the selection,
    // otherwise activate the new selection. The two objects are built for
    // comparison because we cannot simply compare to "appState.mlExplorerSwimlane"
    // since it also includes the "viewBy" attribute which might differ depending
    // on whether the overall or viewby swimlane was selected.
    const oldSelection = {
      selectedType: selection && selection.type,
      selectedLanes: selection && selection.lanes,
      selectedTimes: selection && selection.times
    };

    const newSelection = {
      selectedType: swimlaneType,
      selectedLanes: laneLabels,
      selectedTimes: d3.extent(times)
    };

    if (_.isEqual(oldSelection, newSelection)) {
      triggerNewSelection = false;
    }

    if (triggerNewSelection === false) {
      swimlaneCellClick({});
      return;
    }

    const selectedCells = {
      viewByFieldName: swimlaneData.fieldName,
      lanes: laneLabels,
      times: d3.extent(times),
      type: swimlaneType
    };
    swimlaneCellClick(selectedCells);
  }

  highlightOverall(times) {
    const overallSwimlane = d3.select('.ml-swimlane-overall');
    times.forEach(time => {
      const overallCell = overallSwimlane.selectAll(`div[data-time="${time}"]`).selectAll('.sl-cell-inner,.sl-cell-inner-dragselect');
      overallCell.classed('sl-cell-inner-selected', true);
    });
  }

  highlightSelection(cellsToSelect, laneLabels, times) {
    const { swimlaneType } = this.props;

    // This selects both overall and viewby swimlane
    const wrapper = d3.selectAll('.ml-explorer-swimlane');

    wrapper.selectAll('.lane-label').classed('lane-label-masked', true);
    wrapper.selectAll('.sl-cell-inner,.sl-cell-inner-dragselect').classed('sl-cell-inner-masked', true);
    wrapper.selectAll('.sl-cell-inner.sl-cell-inner-selected,.sl-cell-inner-dragselect.sl-cell-inner-selected')
      .classed('sl-cell-inner-selected', false);

    d3.selectAll(cellsToSelect).selectAll('.sl-cell-inner,.sl-cell-inner-dragselect')
      .classed('sl-cell-inner-masked', false)
      .classed('sl-cell-inner-selected', true);

    const rootParent = d3.select(this.rootNode.parentNode);
    rootParent.selectAll('.lane-label')
      .classed('lane-label-masked', function () {
        return (laneLabels.indexOf(d3.select(this).text()) === -1);
      });

    if (swimlaneType === 'viewBy') {
      // If selecting a cell in the 'view by' swimlane, indicate the corresponding time in the Overall swimlane.
      this.highlightOverall(times);
    }
  }

  maskIrrelevantSwimlanes(maskAll) {
    if (maskAll === true) {
      // This selects both overall and viewby swimlane
      const allSwimlanes = d3.selectAll('.ml-explorer-swimlane');
      allSwimlanes.selectAll('.lane-label').classed('lane-label-masked', true);
      allSwimlanes.selectAll('.sl-cell-inner,.sl-cell-inner-dragselect').classed('sl-cell-inner-masked', true);
    } else {
      const overallSwimlane = d3.select('.ml-swimlane-overall');
      overallSwimlane.selectAll('.lane-label').classed('lane-label-masked', true);
      overallSwimlane.selectAll('.sl-cell-inner,.sl-cell-inner-dragselect').classed('sl-cell-inner-masked', true);
    }
  }

  clearSelection() {
    // This selects both overall and viewby swimlane
    const wrapper = d3.selectAll('.ml-explorer-swimlane');

    wrapper.selectAll('.lane-label').classed('lane-label-masked', false);
    wrapper.selectAll('.sl-cell-inner').classed('sl-cell-inner-masked', false);
    wrapper.selectAll('.sl-cell-inner.sl-cell-inner-selected').classed('sl-cell-inner-selected', false);
    wrapper.selectAll('.sl-cell-inner-dragselect.sl-cell-inner-selected').classed('sl-cell-inner-selected', false);
    wrapper.selectAll('.ds-selected').classed('sl-cell-inner-selected', false);
  }

  renderSwimlane() {
    const element = d3.select(this.rootNode.parentNode);

    // Consider the setting to support to select a range of cells
    if (!ALLOW_CELL_RANGE_SELECTION) {
      element.classed(SCSS.mlHideRangeSelection, true);
    }

    const cellMouseoverActive = this.cellMouseoverActive;

    const {
      chartWidth,
      filterActive,
      maskAll,
      MlTimeBuckets,
      swimlaneCellClick,
      swimlaneData,
      swimlaneType,
      selection,
      intl
    } = this.props;

    const {
      laneLabels: lanes,
      earliest: startTime,
      latest: endTime,
      interval: stepSecs,
      points
    } = swimlaneData;

    function colorScore(value) {
      return getSeverityColor(value);
    }

    const numBuckets = parseInt((endTime - startTime) / stepSecs);
    const cellHeight = 30;
    const height = (lanes.length + 1) * cellHeight - 10;
    const laneLabelWidth = 170;

    element.style('height', `${(height + 20)}px`);
    const swimlanes = element.select('.ml-swimlanes');
    swimlanes.html('');

    const cellWidth = Math.floor(chartWidth / numBuckets * 100) / 100;

    const xAxisWidth = cellWidth * numBuckets;
    const xAxisScale = d3.time.scale()
      .domain([new Date(startTime * 1000), new Date(endTime * 1000)])
      .range([0, xAxisWidth]);

    // Get the scaled date format to use for x axis tick labels.
    const timeBuckets = new MlTimeBuckets();
    timeBuckets.setInterval(`${stepSecs}s`);
    const xAxisTickFormat = timeBuckets.getScaledDateFormat();

    function cellMouseOverFactory(time, i) {
      // Don't use an arrow function here because we need access to `this`,
      // which is where d3 supplies a reference to the corresponding DOM element.
      return function (lane) {
        const bucketScore = getBucketScore(lane, time);
        if (bucketScore !== 0) {
          cellMouseover(this, lane, bucketScore, i, time);
        }
      };
    }

    function cellMouseover(target, laneLabel, bucketScore, index, time) {
      if (bucketScore === undefined || cellMouseoverActive === false) {
        return;
      }

      const displayScore = (bucketScore > 1 ? parseInt(bucketScore) : '< 1');

      // Display date using same format as Kibana visualizations.
      const formattedDate = formatHumanReadableDateTime(time * 1000);
      let contents = `${formattedDate}<br/><hr/>`;
      if (swimlaneData.fieldName !== undefined) {
        contents += `${mlEscape(swimlaneData.fieldName)}: ${mlEscape(laneLabel)}<br/><hr/>`;
      }
      contents += intl.formatMessage(
        { id: 'xpack.ml.explorer.swimlane.maxAnomalyScoreLabel', defaultMessage: 'Max anomaly score: {displayScore}' },
        { displayScore }
      );

      const offsets = (target.className === 'sl-cell-inner' ? { x: 0, y: 0 } : { x: 2, y: 1 });
      mlChartTooltipService.show(contents, target, {
        x: target.offsetWidth - offsets.x,
        y: 10 + offsets.y
      });
    }

    function cellMouseleave() {
      mlChartTooltipService.hide();
    }

    const d3Lanes = swimlanes.selectAll('.lane').data(lanes);
    const d3LanesEnter = d3Lanes.enter().append('div').classed('lane', true);

    d3LanesEnter.append('div')
      .classed('lane-label', true)
      .style('width', `${laneLabelWidth}px`)
      .html(label => {
        const showFilterContext = (filterActive === true && label === 'Overall');
        if (showFilterContext) {
          return i18n.translate('xpack.ml.explorer.overallSwimlaneUnfilteredLabel', {
            defaultMessage: '{label} (unfiltered)',
            values: { label: mlEscape(label) }
          });
        } else {
          return mlEscape(label);
        }
      })
      .on('click', () => {
        if (selection && typeof selection.lanes !== 'undefined') {
          swimlaneCellClick({});
        }
      })
      .each(function () {
        if (swimlaneData.fieldName !== undefined) {
          d3.select(this)
            .attr('tooltip-html-unsafe', label => `${mlEscape(swimlaneData.fieldName)}: ${mlEscape(label)}`)
            .attr('tooltip-placement', 'right')
            .attr('aria-label', label => `${mlEscape(swimlaneData.fieldName)}: ${mlEscape(label)}`);
        }
      });

    const cellsContainer = d3LanesEnter.append('div').classed('cells-container', true);

    function getBucketScore(lane, time) {
      let bucketScore = 0;
      const point = points.find((p) => {
        return (p.value > 0 && p.laneLabel === lane && p.time === time);
      });
      if (typeof point !== 'undefined') {
        bucketScore = point.value;
      }
      return bucketScore;
    }

    // TODO - mark if zoomed in to bucket width?
    let time = startTime;
    Array(numBuckets || 0).fill(null).forEach((v, i) => {
      const cell = cellsContainer.append('div')
        .classed('sl-cell', true)
        .style('width', `${cellWidth}px`)
        .attr('data-lane-label', label => mlEscape(label))
        .attr('data-time', time)
        .attr('data-bucket-score', (lane) => {
          return getBucketScore(lane, time);
        })
        // use a factory here to bind the `time` and `i` values
        // of this iteration to the event.
        .on('mouseover', cellMouseOverFactory(time, i))
        .on('mouseleave', cellMouseleave)
        .each(function (laneLabel) {
          this.__clickData__ = {
            bucketScore: getBucketScore(laneLabel, time),
            laneLabel,
            swimlaneType,
            time
          };
        });

      // calls itself with each() to get access to lane (= d3 data)
      cell.append('div').each(function (lane) {
        const el = d3.select(this);

        let color = 'none';
        let bucketScore = 0;

        const point = points.find((p) => {
          return (p.value > 0 && p.laneLabel === lane && p.time === time);
        });

        if (typeof point !== 'undefined') {
          bucketScore = point.value;
          color = colorScore(bucketScore);
          el.classed('sl-cell-inner', true)
            .style('background-color', color);
        } else {
          el.classed('sl-cell-inner-dragselect', true);
        }
      });

      time += stepSecs;
    });

    // ['x-axis'] is just a placeholder so we have an array of 1.
    const laneTimes = swimlanes.selectAll('.time-tick-labels').data(['x-axis'])
      .enter()
      .append('div')
      .classed('time-tick-labels', true);

    // height of .time-tick-labels
    const svgHeight = 25;
    const svg = laneTimes.append('svg')
      .attr('width', chartWidth)
      .attr('height', svgHeight);

    const xAxis = d3.svg.axis()
      .scale(xAxisScale)
      .ticks(numTicksForDateFormat(chartWidth, xAxisTickFormat))
      .tickFormat(tick => moment(tick).format(xAxisTickFormat));

    const gAxis = svg.append('g').attr('class', 'x axis').call(xAxis);

    // remove overlapping labels
    let overlapCheck = 0;
    gAxis.selectAll('g.tick').each(function () {
      const tick = d3.select(this);
      const xTransform = d3.transform(tick.attr('transform')).translate[0];
      const tickWidth = tick.select('text').node().getBBox().width;
      const xMinOffset = xTransform - (tickWidth / 2);
      const xMaxOffset = xTransform + (tickWidth / 2);
      // if the tick label overlaps the previous label
      // (or overflows the chart to the left), remove it;
      // otherwise pick that label's offset as the new offset to check against
      if (xMinOffset < overlapCheck) {
        tick.remove();
      } else {
        overlapCheck = xTransform + (tickWidth / 2);
      }
      // if the last tick label overflows the chart to the right, remove it
      if (xMaxOffset > chartWidth) {
        tick.remove();
      }
    });

    // Check for selection and reselect the corresponding swimlane cell
    // if the time range and lane label are still in view.
    const selectionState = selection;
    const selectedType = _.get(selectionState, 'type', undefined);
    const selectionViewByFieldName = _.get(selectionState, 'viewByFieldName', '');

    // If a selection was done in the other swimlane, add the "masked" classes
    // to de-emphasize the swimlane cells.
    if (swimlaneType !== selectedType && selectedType !== undefined) {
      element.selectAll('.lane-label').classed('lane-label-masked', true);
      element.selectAll('.sl-cell-inner').classed('sl-cell-inner-masked', true);
    }

    this.props.swimlaneRenderDoneListener();

    if (
      ((swimlaneType !== selectedType) ||
      (swimlaneData.fieldName !== undefined && swimlaneData.fieldName !== selectionViewByFieldName)) &&
      filterActive === false
    ) {
      // Not this swimlane which was selected.
      return;
    }

    const cellsToSelect = [];
    const selectedLanes = _.get(selectionState, 'lanes', []);
    const selectedTimes = _.get(selectionState, 'times', []);
    const selectedTimeExtent = d3.extent(selectedTimes);

    selectedLanes.forEach((selectedLane) => {
      if (lanes.indexOf(selectedLane) > -1 && selectedTimeExtent[0] >= startTime && selectedTimeExtent[1] <= endTime) {
        // Locate matching cell - look for exact time, otherwise closest before.
        const swimlaneElements = element.select('.ml-swimlanes');
        const laneCells = swimlaneElements.selectAll(`div[data-lane-label="${mlEscape(selectedLane)}"]`);

        laneCells.each(function () {
          const cell = d3.select(this);
          const cellTime = cell.attr('data-time');
          if (cellTime >= selectedTimeExtent[0] && cellTime <= selectedTimeExtent[1]) {
            cellsToSelect.push(cell.node());
          }
        });
      }
    });

    const selectedMaxBucketScore = cellsToSelect.reduce((maxBucketScore, cell) => {
      return Math.max(maxBucketScore, +d3.select(cell).attr('data-bucket-score') || 0);
    }, 0);

    if (cellsToSelect.length > 1 || selectedMaxBucketScore > 0) {
      this.highlightSelection(cellsToSelect, selectedLanes, selectedTimes);
    } else if (filterActive === true) {
      if (selectedTimes) {
        this.highlightOverall(selectedTimes);
      }
      this.maskIrrelevantSwimlanes(maskAll);
    } else {
      this.clearSelection();
    }
  }

  shouldComponentUpdate() {
    return true;
  }

  setRef(componentNode) {
    this.rootNode = componentNode;
  }

  render() {
    const { swimlaneType } = this.props;

    return <div className={`ml-swimlanes ml-swimlane-${swimlaneType}`} ref={this.setRef.bind(this)} />;
  }
});
