/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { timefilter } from 'ui/timefilter';
import moment from 'moment';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';
import { FullTimeRangeSelector } from '../../../../../components/full_time_range_selector';
import { EventRateChart } from '../charts/event_rate_chart';
import { LineChartPoint } from '../../../common/chart_loader';
import { TimeRangePicker } from './time_range_picker';
import { GetTimeFieldRangeResponse } from '../../../../../services/ml_api_service';

export const TimeRangeStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
  } = useContext(JobCreatorContext);

  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);

  async function loadChart() {
    const resp = await chartLoader.loadEventRateChart(
      jobCreator.start,
      jobCreator.end,
      chartInterval.getInterval().asMilliseconds()
    );
    setEventRateChartData(resp);
  }

  useEffect(() => {
    jobCreator.setTimeRange(start, end);
    chartInterval.setBounds({
      min: moment(start),
      max: moment(end),
    });
    // update the timefilter, to keep the URL in sync
    timefilter.setTime({
      from: moment(start).toISOString(),
      to: moment(end).toISOString(),
    });

    jobCreatorUpdate();
    loadChart();
  }, [start, end]);

  useEffect(() => {
    setStart(jobCreator.start);
    setEnd(jobCreator.end);
  }, [jobCreatorUpdated]);

  function fullTimeRangeCallback(range: GetTimeFieldRangeResponse) {
    setStart(range.start.epoch);
    setEnd(range.end.epoch);
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <TimeRangePicker setStart={setStart} setEnd={setEnd} start={start} end={end} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FullTimeRangeSelector
                indexPattern={kibanaContext.currentIndexPattern}
                query={kibanaContext.combinedQuery}
                disabled={false}
                callback={fullTimeRangeCallback}
              />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
          <EuiSpacer />
          <EventRateChart
            eventRateChartData={eventRateChartData}
            height="300px"
            width="100%"
            showAxis={true}
          />

          <WizardNav next={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)} nextActive={true} />
        </Fragment>
      )}
    </Fragment>
  );
};
