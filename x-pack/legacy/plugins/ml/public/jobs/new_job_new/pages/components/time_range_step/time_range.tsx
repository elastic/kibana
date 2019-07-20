/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { timefilter } from 'ui/timefilter';
import moment from 'moment';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';
import {
  FullTimeRangeSelector,
  getTimeFilterRange,
} from '../../../../../components/full_time_range_selector';
import { EventRateChart } from '../charts/event_rate_chart';
import { LineChartPoint } from '../../../common/chart_loader';

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
    jobCreatorUpdate();
    loadChart();
  }, [start, end]);

  useEffect(() => {
    setStart(jobCreator.start);
    setEnd(jobCreator.end);
  }, [jobCreatorUpdated]);

  const timefilterChange = () => {
    const { to, from } = getTimeFilterRange();
    if (to >= from) {
      setStart(from);
      setEnd(to);
    }
  };

  useEffect(() => {
    timefilter.on('timeUpdate', timefilterChange);
    return () => {
      timefilter.off('timeUpdate', timefilterChange);
    };
  }, []);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EventRateChart
            eventRateChartData={eventRateChartData}
            height="300px"
            width="100%"
            showAxis={true}
          />
          <FullTimeRangeSelector
            indexPattern={kibanaContext.currentIndexPattern}
            query={kibanaContext.combinedQuery}
            disabled={false}
          />
          <WizardNav next={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)} nextActive={true} />
        </Fragment>
      )}
    </Fragment>
  );
};
