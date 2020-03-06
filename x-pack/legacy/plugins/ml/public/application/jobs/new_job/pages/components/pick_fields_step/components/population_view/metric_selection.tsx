/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState, useReducer } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { PopulationJobCreator } from '../../../../../common/job_creator';
import { LineChartData } from '../../../../../common/chart_loader';
import { DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { Field, AggFieldPair } from '../../../../../../../../../common/types/fields';
import { getChartSettings, defaultChartSettings } from '../../../charts/common/settings';
import { MetricSelector } from './metric_selector';
import { SplitFieldSelector } from '../split_field';
import { ChartGrid } from './chart_grid';
import { mlMessageBarService } from '../../../../../../../components/messagebar';

interface Props {
  setIsValid: (na: boolean) => void;
}

type DetectorFieldValues = Record<number, string[]>;

export const PopulationDetectors: FC<Props> = ({ setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
  } = useContext(JobCreatorContext);
  const jobCreator = jc as PopulationJobCreator;

  const { fields } = newJobCapsService;
  const [selectedOptions, setSelectedOptions] = useState<DropDownProps>([]);
  const [aggFieldPairList, setAggFieldPairList] = useState<AggFieldPair[]>(
    jobCreator.aggFieldPairs
  );
  const [lineChartsData, setLineChartsData] = useState<LineChartData>({});
  const [loadingData, setLoadingData] = useState(false);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [bucketSpanMs, setBucketSpanMs] = useState(jobCreator.bucketSpanMs);
  const [chartSettings, setChartSettings] = useState(defaultChartSettings);
  const [splitField, setSplitField] = useState(jobCreator.splitField);
  const [fieldValuesPerDetector, setFieldValuesPerDetector] = useState<DetectorFieldValues>({});
  const [byFieldsUpdated, setByFieldsUpdated] = useReducer<(s: number, action: any) => number>(
    s => s + 1,
    0
  );
  const [pageReady, setPageReady] = useState(false);
  const updateByFields = () => setByFieldsUpdated(0);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    addDetector(selectedOptionsIn);
  }

  function addDetector(selectedOptionsIn: DropDownLabel[]) {
    if (selectedOptionsIn !== null && selectedOptionsIn.length) {
      const option = selectedOptionsIn[0] as DropDownLabel;
      if (typeof option !== 'undefined') {
        const newPair = { agg: option.agg, field: option.field, by: { field: null, value: null } };
        setAggFieldPairList([...aggFieldPairList, newPair]);
        setSelectedOptions([]);
      } else {
        setAggFieldPairList([]);
      }
    }
  }

  function deleteDetector(index: number) {
    aggFieldPairList.splice(index, 1);
    setAggFieldPairList([...aggFieldPairList]);
    updateByFields();
  }

  useEffect(() => {
    setPageReady(true);
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
  }, [JSON.stringify(fieldValuesPerDetector), splitField, pageReady]);

  // watch for change in jobCreator
  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      loadCharts();
    }

    if (jobCreator.bucketSpanMs !== bucketSpanMs) {
      setBucketSpanMs(jobCreator.bucketSpanMs);
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
      updateByFields();
    }
  }, [jobCreatorUpdated]);

  // watch for changes in split field or by fields.
  // load example field values
  // changes to fieldValues here will trigger the card effect via setFieldValuesPerDetector
  useEffect(() => {
    loadFieldExamples();
  }, [splitField, byFieldsUpdated]);

  async function loadCharts() {
    if (allDataReady()) {
      setLoadingData(true);
      try {
        const cs = getChartSettings(jobCreator, chartInterval);
        setChartSettings(cs);
        const resp: LineChartData = await chartLoader.loadPopulationCharts(
          jobCreator.start,
          jobCreator.end,
          aggFieldPairList,
          jobCreator.splitField,
          cs.intervalMs
        );

        setLineChartsData(resp);
      } catch (error) {
        mlMessageBarService.notify.error(error);
        setLineChartsData([]);
      }
      setLoadingData(false);
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

  function allDataReady() {
    let ready = aggFieldPairList.length > 0;
    aggFieldPairList.forEach(af => {
      if (af.by !== undefined && af.by.field !== null) {
        // if a by field is set, it's only ready when the value is loaded
        ready = ready && af.by.value !== null;
      }
    });
    return ready;
  }

  return (
    <Fragment>
      <SplitFieldSelector />
      {splitField !== null && <EuiHorizontalRule margin="l" />}

      {splitField !== null && (
        <ChartGrid
          aggFieldPairList={aggFieldPairList}
          chartSettings={chartSettings}
          splitField={splitField}
          lineChartsData={lineChartsData}
          modelData={[]}
          anomalyData={[]}
          deleteDetector={deleteDetector}
          jobType={jobCreator.type}
          fieldValuesPerDetector={fieldValuesPerDetector}
          loading={loadingData}
        />
      )}
      {splitField !== null && (
        <MetricSelector
          fields={fields}
          detectorChangeHandler={detectorChangeHandler}
          selectedOptions={selectedOptions}
          removeOptions={[]}
        />
      )}
    </Fragment>
  );
};
