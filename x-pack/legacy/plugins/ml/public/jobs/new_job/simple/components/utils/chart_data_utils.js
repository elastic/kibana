/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// various util functions for populating the chartData object used by the job wizards

import _ from 'lodash';
import { MlTimeBuckets } from 'plugins/ml/util/ml_time_buckets';
import { calculateTextWidth } from 'plugins/ml/util/string_utils';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { mlSimpleJobSearchService } from 'plugins/ml/jobs/new_job/simple/components/utils/search_service';
import { timefilter } from 'ui/timefilter';

export function ChartDataUtilsProvider() {

  function loadDocCountData(formConfig, chartData) {
    return new Promise((resolve, reject) => {
      // set doc count chart to be 10x less than detector charts
      const BAR_TARGET = Math.ceil(formConfig.chartInterval.barTarget / 10);
      const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger that bar target
      const query = formConfig.combinedQuery;
      const bounds = timefilter.getActiveBounds();
      const buckets = new MlTimeBuckets();
      buckets.setBarTarget(BAR_TARGET);
      buckets.setMaxBars(MAX_BARS);
      buckets.setInterval('auto');
      buckets.setBounds(bounds);

      const interval = buckets.getInterval().asMilliseconds();

      const end = formConfig.end;
      const start = formConfig.start;

      mlResultsService.getEventRateData(
        formConfig.indexPattern.title,
        query,
        formConfig.timeField,
        start,
        end,
        (interval + 'ms'))
        .then((resp) => {
          let highestValue = 0;
          chartData.job.bars = [];

          _.each(resp.results, (value, t) => {
            if (!isFinite(value)) {
              value = 0;
            }

            if (value > highestValue) {
              highestValue = value;
            }

            const time = +t;
            const date = new Date(time);
            chartData.job.barsInterval = interval;
            chartData.job.bars.push({
              date,
              time,
              value,
            });
          });

          chartData.totalResults = resp.total;
          chartData.eventRateHighestValue = Math.ceil(highestValue);

          resolve(chartData);
        }).catch((resp) => {
          console.log('getEventRate visualization - error getting event rate data from elasticsearch:', resp);
          reject(resp);
        });
    });
  }

  function loadJobSwimlaneData(formConfig, chartData) {
    return new Promise((resolve) => {
      mlResultsService.getScoresByBucket(
        [formConfig.jobId],
        formConfig.start,
        formConfig.end,
        formConfig.resultsIntervalSeconds + 's',
        1
      )
        .then((data) => {
          let time = formConfig.start;

          const jobResults = data.results[formConfig.jobId];

          chartData.job.swimlane = [];
          _.each(jobResults, (value, t) => {
            time = +t;
            const date = new Date(time);
            chartData.job.swimlane.push({
              date,
              time,
              value,
              color: ''
            });
          });

          const pcnt = ((time - formConfig.start + formConfig.resultsIntervalSeconds) / (formConfig.end - formConfig.start) * 100);

          chartData.percentComplete = Math.round(pcnt);
          chartData.job.percentComplete = chartData.percentComplete;
          chartData.job.swimlaneInterval = formConfig.resultsIntervalSeconds * 1000;

          resolve(chartData);
        })
        .catch(() => {
          resolve(chartData);
        });
    });
  }

  function loadDetectorSwimlaneData(formConfig, chartData) {
    return new Promise((resolve) => {
      mlSimpleJobSearchService.getScoresByRecord(
        formConfig.jobId,
        formConfig.start,
        formConfig.end,
        formConfig.resultsIntervalSeconds + 's',
        {
          name: (formConfig.splitField !== undefined) ? formConfig.splitField.name : undefined,
          value: formConfig.firstSplitFieldName
        }
      )
        .then((data) => {
          let dtrIndex = 0;
          _.each(formConfig.fields, (field, key) => {

            const dtr = chartData.detectors[key];
            const times = data.results[dtrIndex];

            dtr.swimlane = [];
            _.each(times, (timeObj, t) => {
              const time = +t;
              const date = new Date(time);
              dtr.swimlane.push({
                date: date,
                time: time,
                value: timeObj.recordScore,
                color: ''
              });
            });

            dtr.percentComplete = chartData.percentComplete;
            dtr.swimlaneInterval = formConfig.resultsIntervalSeconds * 1000;

            dtrIndex++;
          });

          resolve(chartData);
        })
        .catch(() => {
          resolve(chartData);
        });
    });
  }

  function getSplitFields(formConfig, splitFieldName, size) {
    const query = formConfig.combinedQuery;
    return mlSimpleJobSearchService.getCategoryFields(
      formConfig.indexPattern.title,
      splitFieldName,
      size,
      query);
  }

  function updateChartMargin(chartData) {
    // Find the formatted value with the longest width across charts.
    let longestTextWidth = calculateTextWidth(chartData.eventRateHighestValue, true);

    // For fields with formatters, check the width for the value, plus a secondary check
    // on the highest value multiplied by an irrational number, to minimize the chances
    // of the highestValue not corresponding to the full quota of decimal places
    // when formatted e.g. 12.340KB would be formatted to only 2 decimal places 12.34KB
    const textCheckMultiplier = 1 + (Math.sqrt(2) / 100);
    _.each(chartData.detectors, (detector) => {
      let longestWidthForDetector = 0;
      if (detector.fieldFormat !== undefined) {
        const longestTextForDetector = detector.fieldFormat.convert(detector.highestValue, 'text');
        longestWidthForDetector = calculateTextWidth(longestTextForDetector, false);
        const longestTextCheck = detector.fieldFormat.convert(detector.highestValue * textCheckMultiplier, 'text');
        const longestWidthCheck = calculateTextWidth(longestTextCheck, false);
        longestWidthForDetector = Math.max(longestWidthForDetector, longestWidthCheck);
      } else {
        longestWidthForDetector = calculateTextWidth(detector.highestValue, true);
      }
      longestTextWidth = Math.max(longestTextWidth, longestWidthForDetector);
    });

    // Append extra 10px to width of tick label for highest axis value to allow for tick padding.
    chartData.chartTicksMargin.width = longestTextWidth + 10;
  }

  return {
    loadDocCountData,
    loadJobSwimlaneData,
    loadDetectorSwimlaneData,
    getSplitFields,
    updateChartMargin
  };
}
