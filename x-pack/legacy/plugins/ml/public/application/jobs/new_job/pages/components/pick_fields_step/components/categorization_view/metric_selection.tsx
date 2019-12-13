/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { EuiCode } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { ml } from '../../../../../../../services/ml_api_service';
// import { LineChartData } from '../../../../../common/chart_loader';
// import { DropDownProps, createLabel } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { mlCategory } from '../../../../../../../../../common/types/fields';
import { CategorizationField } from '../categorization_field';
import { useKibanaContext } from '../../../../../../../contexts/kibana';
import { FieldExamples } from './field_examples';

interface Props {
  setIsValid: (na: boolean) => void;
}

interface Token {
  token: string;
  start_offset: number;
  end_offset: number;
  type: string;
  position: number;
}

interface Cat {
  text: string;
  tokens: Token[];
}

const NUM_OF_EXAMPLES = 5;

// const DTR_IDX = 0;

export const CategorizationDetectors: FC<Props> = ({ setIsValid }) => {
  const kibanaContext = useKibanaContext();
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    // chartLoader,
    // chartInterval,
  } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;

  // const { fields } = newJobCapsService;
  // const [selectedOptions, setSelectedOptions] = useState<DropDownProps>(
  //   jobCreator.aggFieldPair !== null ? [{ label: createLabel(jobCreator.aggFieldPair) }] : []
  // );
  // const [aggFieldPair, setAggFieldPair] = useState<AggFieldPair | null>(jobCreator.aggFieldPair);
  // const [lineChartsData, setLineChartData] = useState<LineChartData>({});
  const [loadingData, setLoadingData] = useState(false);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [fieldExamples, setFieldExamples] = useState<Cat[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  // const [bucketSpanMs, setBucketSpanMs] = useState(jobCreator.bucketSpanMs);

  const [categorizationFieldName, setCategorizationFieldName] = useState(
    jobCreator.categorizationFieldName
  );

  // useEffect(() => {
  //   if (jobCreator.detectors.length !== 1) {
  //     const agg = newJobCapsService.getAggById('count');
  //     if (agg !== null) {
  //       jobCreator.setDetector(agg, mlCategory);
  //       jobCreatorUpdate();
  //     }
  //   }
  // }, []);

  useEffect(() => {
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      jobCreator.categorizationFieldName = categorizationFieldName;
      jobCreatorUpdate();
    }
    loadFieldExamples();
  }, [categorizationFieldName]);

  // function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
  //   setSelectedOptions(selectedOptionsIn);
  //   if (selectedOptionsIn.length) {
  //     const option = selectedOptionsIn[0];
  //     if (typeof option !== 'undefined') {
  //       setAggFieldPair({ agg: option.agg, field: option.field });
  //     } else {
  //       setAggFieldPair(null);
  //     }
  //   }
  // }

  // useEffect(() => {
  //   if (aggFieldPair !== null) {
  //     jobCreator.setDetector(aggFieldPair.agg, aggFieldPair.field);
  //     jobCreatorUpdate();
  //     loadChart();
  //     setIsValid(aggFieldPair !== null);
  //   }
  // }, [aggFieldPair]);

  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      loadFieldExamples();
    }
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      setCategorizationFieldName(jobCreator.categorizationFieldName);
    }
  }, [jobCreatorUpdated]);

  async function loadFieldExamples() {
    if (categorizationFieldName !== null) {
      setLoadingData(true);
      const resp = await ml.jobs.categorizationFieldExamples(
        kibanaContext.currentIndexPattern.title,
        kibanaContext.combinedQuery,
        NUM_OF_EXAMPLES,
        categorizationFieldName,
        0,
        0
      );
      // const examples = resp.map(r => r.text);
      // const tkns = resp.map(r => r.tokens);
      // console.log(resp);
      setFieldExamples(resp);
      // const resp = await ml.esSearch({
      //   index: kibanaContext.currentIndexPattern.title,
      //   size: 10,
      //   body: {
      //     _source: categorizationFieldName,
      //     query: kibanaContext.combinedQuery,
      //   },
      // });
      // try {
      //   const cs = getChartSettings(jobCreator, chartInterval);
      //   const resp: LineChartData = await chartLoader.loadLineCharts(
      //     jobCreator.start,
      //     jobCreator.end,
      //     [aggFieldPair],
      //     null,
      //     null,
      //     cs.intervalMs
      //   );
      //   if (resp[DTR_IDX] !== undefined) {
      //     setLineChartData(resp);
      //   }
      // } catch (error) {
      //   mlMessageBarService.notify.error(error);
      //   setLineChartData({});
      // }
      setLoadingData(false);
    } else {
      setFieldExamples([]);
    }
    setIsValid(categorizationFieldName !== null);
  }

  return (
    <Fragment>
      <CategorizationField />
      <FieldExamples fieldExamples={fieldExamples} />

      {/* <AggSelect
        fields={fields}
        changeHandler={detectorChangeHandler}
        selectedOptions={selectedOptions}
        removeOptions={[]}
      /> */}
      {/* {(lineChartsData[DTR_IDX] !== undefined || loadingData === true) && (
        <Fragment>
          <AnomalyChart
            chartType={CHART_TYPE.LINE}
            chartData={lineChartsData[DTR_IDX]}
            modelData={[]}
            anomalyData={[]}
            height="300px"
            width="100%"
            loading={loadingData}
          />
        </Fragment>
      )} */}
    </Fragment>
  );
};
