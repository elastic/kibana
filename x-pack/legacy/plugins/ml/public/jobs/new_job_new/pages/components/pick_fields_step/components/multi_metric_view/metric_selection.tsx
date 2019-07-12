/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { JobCreatorContext } from '../../../job_creator_context';
import { MultiMetricJobCreator, isMultiMetricJobCreator } from '../../../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import { LineChartData } from '../../../../../common/chart_loader';
import { DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { AggFieldPair, EVENT_RATE_FIELD_ID } from '../../../../../../../../common/types/fields';
import { defaultChartSettings, ChartSettings } from '../../../charts/common/settings';
import { MetricSelector } from './metric_selector';
import { JobProgress } from '../job_progress';
import { ChartGrid } from './chart_grid';

interface Props {
  isActive: boolean;
  setIsValid: (na: boolean) => void;
}

export const MultiMetricDetectors: FC<Props> = ({ isActive, setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
    resultsLoader,
  } = useContext(JobCreatorContext);

  if (isMultiMetricJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as MultiMetricJobCreator;

  const { fields } = newJobCapsService;
  const [selectedOptions, setSelectedOptions] = useState<DropDownProps>([{ label: '' }]);
  const [aggFieldPairList, setAggFieldPairList] = useState<AggFieldPair[]>([]);
  const [lineChartsData, setLineChartsData] = useState<LineChartData>({});
  const [modelData, setModelData] = useState<Record<number, ModelItem[]>>([]);
  const [anomalyData, setAnomalyData] = useState<Record<number, Anomaly[]>>([]);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [chartSettings, setChartSettings] = useState(defaultChartSettings);
  const [splitField, setSplitField] = useState(jobCreator.splitField);
  const [fieldValues, setFieldValues] = useState<string[]>([]);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    addDetector(selectedOptionsIn);
  }

  function addDetector(selectedOptionsIn: DropDownLabel[]) {
    if (selectedOptionsIn !== null && selectedOptionsIn.length) {
      const option = selectedOptionsIn[0] as DropDownLabel;
      if (typeof option !== 'undefined') {
        const newPair = { agg: option.agg, field: option.field };
        setAggFieldPairList([...aggFieldPairList, newPair]);
        setSelectedOptions([{ label: '' }]);
      } else {
        setAggFieldPairList([]);
      }
    }
  }

  function deleteDetector(index: number) {
    aggFieldPairList.splice(index, 1);
    setAggFieldPairList([...aggFieldPairList]);
  }

  function setResultsWrapper(results: Results) {
    setModelData(results.model);
    setAnomalyData(results.anomalies);
  }

  useEffect(() => {
    // subscribe to progress and results
    jobCreator.subscribeToProgress(setProgress);
    const subscription = resultsLoader.subscribeToResults(setResultsWrapper);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // watch for changes in detector list length
  useEffect(() => {
    jobCreator.removeAllDetectors();
    aggFieldPairList.forEach(pair => {
      const field = pair.field.id === EVENT_RATE_FIELD_ID ? null : pair.field;
      jobCreator.addDetector(pair.agg, field);
    });
    jobCreatorUpdate();
    loadCharts();
    setIsValid(aggFieldPairList.length > 0);
  }, [aggFieldPairList.length]);

  // watch for change in jobCreator
  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      loadCharts();
    }
    setSplitField(jobCreator.splitField);
  }, [jobCreatorUpdated]);

  // watch for changes in split field.
  // load example field values
  // changes to fieldValues here will trigger the card effect
  useEffect(() => {
    if (splitField !== null) {
      chartLoader
        .loadFieldExampleValues(splitField)
        .then(setFieldValues)
        .catch(() => {});
    } else {
      setFieldValues([]);
    }
  }, [splitField]);

  // watch for changes in the split field values
  // reload the charts
  useEffect(() => {
    loadCharts();
  }, [fieldValues]);

  function getChartSettings(): ChartSettings {
    const cs = {
      ...defaultChartSettings,
      intervalMs: chartInterval.getInterval().asMilliseconds(),
    };
    if (aggFieldPairList.length > 2) {
      cs.cols = 3;
      cs.height = '150px';
      cs.intervalMs = cs.intervalMs * 3;
    } else if (aggFieldPairList.length > 1) {
      cs.cols = 2;
      cs.height = '200px';
      cs.intervalMs = cs.intervalMs * 2;
    }
    return cs;
  }

  async function loadCharts() {
    const cs = getChartSettings();
    setChartSettings(cs);

    if (aggFieldPairList.length > 0) {
      const resp: LineChartData = await chartLoader.loadLineCharts(
        jobCreator.start,
        jobCreator.end,
        aggFieldPairList,
        jobCreator.splitField,
        fieldValues.length > 0 ? fieldValues[0] : null,
        cs.intervalMs
      );

      setLineChartsData(resp);
    }
  }

  return (
    <Fragment>
      {lineChartsData && (
        <ChartGrid
          aggFieldPairList={aggFieldPairList}
          chartSettings={chartSettings}
          splitField={splitField}
          fieldValues={fieldValues}
          lineChartsData={lineChartsData}
          modelData={modelData}
          anomalyData={anomalyData}
          deleteDetector={isActive ? deleteDetector : undefined}
          jobType={jobCreator.type}
        />
      )}
      {isActive && (
        <MetricSelector
          fields={fields}
          detectorChangeHandler={detectorChangeHandler}
          selectedOptions={selectedOptions}
          removeOptions={aggFieldPairList}
        />
      )}
      {isActive === false && (
        <Fragment>{lineChartsData && <JobProgress progress={progress} />}</Fragment>
      )}
    </Fragment>
  );
};
