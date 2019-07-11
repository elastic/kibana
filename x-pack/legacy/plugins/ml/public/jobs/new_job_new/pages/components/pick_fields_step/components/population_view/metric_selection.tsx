/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState, useReducer } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { PopulationJobCreator, isPopulationJobCreator } from '../../../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import { LineChartData } from '../../../../../common/chart_loader';
import { DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { Field, AggFieldPair } from '../../../../../../../../common/types/fields';
import { defaultChartSettings, ChartSettings } from '../../../charts/common/settings';
import { MetricSelector } from './metric_selector';
import { JobProgress } from '../job_progress';
import { SplitFieldSelector } from '../split_field';
import { MlTimeBuckets } from '../../../../../../../util/ml_time_buckets';
import { ChartGrid } from './chart_grid';

interface Props {
  isActive: boolean;
  setIsValid: (na: boolean) => void;
}

type DetectorFieldValues = Record<number, string[]>;

export const PopulationDetectors: FC<Props> = ({ isActive, setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
    resultsLoader,
  } = useContext(JobCreatorContext);

  if (isPopulationJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as PopulationJobCreator;

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
  const [fieldValuesPerDetector, setFieldValuesPerDetector] = useState<DetectorFieldValues>({});
  const [byFieldsUpdated, setByFieldsUpdated] = useReducer<(s: number) => number>(s => s + 1, 0);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    addDetector(selectedOptionsIn);
  }

  function addDetector(selectedOptionsIn: DropDownLabel[]) {
    if (selectedOptionsIn !== null && selectedOptionsIn.length) {
      const option = selectedOptionsIn[0] as DropDownLabel;
      if (typeof option !== 'undefined') {
        const newPair = { agg: option.agg, field: option.field, by: { field: null, value: null } };
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

  // subscribe to progress
  useEffect(() => {
    jobCreator.subscribeToProgress(setProgress);
  }, []);

  // subscribe to results
  useEffect(() => {
    resultsLoader.subscribeToResults(setResultsWrapper);
  }, []);

  // watch for changes in detector list length
  useEffect(() => {
    jobCreator.removeAllDetectors();
    aggFieldPairList.forEach((pair, i) => {
      jobCreator.addDetector(pair.agg, pair.field);
      if (pair.by !== undefined) {
        // re-add by fields
        jobCreator.setByField(pair.by.field, i);
      }
    });
    jobCreatorUpdate();
    loadCharts();
    setIsValid(aggFieldPairList.length > 0);
  }, [aggFieldPairList.length]);

  // watch for changes in by field values
  // redraw the charts if they change.
  // triggered when example fields have been loaded
  // if the split field or by fields have changed
  useEffect(() => {
    loadCharts();
  }, [JSON.stringify(fieldValuesPerDetector)]);

  // watch for change in jobCreator
  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      loadCharts();
    }
    setSplitField(jobCreator.splitField);

    // update by fields and their by fields
    let update = false;
    const newList = [...aggFieldPairList];
    newList.forEach((pair, i) => {
      const bf = jobCreator.getByField(i);
      if (pair.by !== undefined && pair.by.field !== bf) {
        pair.by.field = bf;
        update = true;
      }
    });
    if (update) {
      setAggFieldPairList(newList);
      setByFieldsUpdated(0);
    }
  }, [jobCreatorUpdated]);

  // watch for changes in split field or by fields.
  // load example field values
  // changes to fieldValues here will trigger the card effect via setFieldValuesPerDetector
  useEffect(() => {
    loadFieldExamples();
  }, [splitField, byFieldsUpdated]);

  function getChartSettings(): ChartSettings {
    const interval = new MlTimeBuckets();
    interval.setInterval('auto');
    interval.setBounds(chartInterval.getBounds());

    const cs = {
      ...defaultChartSettings,
      intervalMs: interval.getInterval().asMilliseconds(),
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
      const resp: LineChartData = await chartLoader.loadPopulationCharts(
        jobCreator.start,
        jobCreator.end,
        aggFieldPairList,
        jobCreator.splitField,
        cs.intervalMs
      );

      setLineChartsData(resp);
    }
  }

  async function loadFieldExamples() {
    const promises: any[] = [];
    aggFieldPairList.forEach((af, i) => {
      if (af.by !== undefined && af.by.field !== null) {
        promises.push(
          (async (index: number, field: Field) => {
            return {
              index,
              fields: await chartLoader.loadFieldExampleValues(field),
            };
          })(i, af.by.field)
        );
      }
    });
    const results = await Promise.all(promises);
    const fieldValues = results.reduce((p, c) => {
      p[c.index] = c.fields;
      return p;
    }, {}) as DetectorFieldValues;

    const newPairs = aggFieldPairList.map((pair, i) => ({
      ...pair,
      ...(pair.by === undefined || pair.by.field === null
        ? {}
        : {
            by: {
              ...pair.by,
              value: fieldValues[i][0],
            },
          }),
    }));
    setAggFieldPairList([...newPairs]);
    setFieldValuesPerDetector(fieldValues);
  }

  return (
    <Fragment>
      {isActive === true && (
        <Fragment>
          <SplitFieldSelector />
          {splitField !== null && <EuiHorizontalRule margin="l" />}
        </Fragment>
      )}

      {isActive === false && splitField === null && (
        <Fragment>
          Population label TODO
          {splitField !== null && <EuiHorizontalRule margin="l" />}
        </Fragment>
      )}

      {lineChartsData && splitField !== null && (
        <ChartGrid
          aggFieldPairList={aggFieldPairList}
          chartSettings={chartSettings}
          splitField={splitField}
          lineChartsData={lineChartsData}
          modelData={modelData}
          anomalyData={anomalyData}
          deleteDetector={isActive ? deleteDetector : undefined}
          jobType={jobCreator.type}
          fieldValuesPerDetector={fieldValuesPerDetector}
        />
      )}
      {isActive === true && splitField !== null && (
        <MetricSelector
          fields={fields}
          detectorChangeHandler={detectorChangeHandler}
          selectedOptions={selectedOptions}
          maxWidth={560}
          removeOptions={aggFieldPairList}
        />
      )}
      {isActive === false && (
        <Fragment>{lineChartsData && <JobProgress progress={progress} />}</Fragment>
      )}
    </Fragment>
  );
};
