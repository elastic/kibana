/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import moment from 'moment';
import { FullTimeRangeSelector, FROZEN_TIER_PREFERENCE } from '@kbn/ml-date-picker';
import { useTimefilter, type GetTimeFieldRangeResponse } from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';
import { ML_INTERNAL_BASE_PATH } from '../../../../../../../common/constants/app';
import { WizardNav } from '../wizard_nav';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { useDataSource } from '../../../../../contexts/ml';
import { EventRateChart } from '../charts/event_rate_chart';
import type { LineChartPoint } from '../../../common/chart_loader';
import { JOB_TYPE } from '../../../../../../../common/constants/new_job';
import type { TimeRange } from '../../../common/components';
import { TimeRangePicker } from '../../../common/components';
import { useMlKibana } from '../../../../../contexts/kibana';
import {
  ML_FROZEN_TIER_PREFERENCE,
  type MlStorageKey,
  type TMlStorageMapped,
} from '../../../../../../../common/types/storage';

export const TimeRangeStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const timefilter = useTimefilter();
  const { services } = useMlKibana();
  const dataSourceContext = useDataSource();

  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated, chartLoader, chartInterval } =
    useContext(JobCreatorContext);

  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: jobCreator.start,
    end: jobCreator.end,
  });
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    MlStorageKey,
    TMlStorageMapped<typeof ML_FROZEN_TIER_PREFERENCE>
  >(
    ML_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  async function loadChart() {
    setLoadingData(true);
    try {
      const resp = await chartLoader.loadEventRateChart(
        jobCreator.start,
        jobCreator.end,
        chartInterval.getInterval().asMilliseconds(),
        jobCreator.runtimeMappings ?? undefined,
        jobCreator.datafeedConfig.indices_options
      );
      setEventRateChartData(resp);
    } catch (error) {
      setEventRateChartData([]);
    }
    setLoadingData(false);
  }

  useEffect(() => {
    const { start, end } = timeRange;
    jobCreator.setTimeRange(start, end);
    chartInterval.setBounds({
      min: moment(start),
      max: moment(end),
    });
    // update the timefilter, to keep the URL in sync
    const { timefilter: timefilterService } = services.data.query.timefilter;
    timefilterService.setTime({
      from: moment(start).toISOString(),
      to: moment(end).toISOString(),
    });

    jobCreatorUpdate();
    loadChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    jobCreator,
    chartInterval,
    timeRange.start,
    timeRange.end,
    jobCreatorUpdate,
    services.data.query.timefilter,
  ]);

  useEffect(() => {
    setTimeRange({
      start: jobCreator.start,
      end: jobCreator.end,
    });
  }, [jobCreator, jobCreatorUpdated]);

  function fullTimeRangeCallback(range: GetTimeFieldRangeResponse) {
    if (range.start !== null && range.end !== null) {
      setTimeRange({
        start: range.start.epoch,
        end: range.end.epoch,
      });
    } else {
      const { toasts } = services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.newJob.wizard.timeRangeStep.fullTimeRangeError', {
          defaultMessage:
            'An error occurred obtaining the time range for the index. Please set the desired start and end times.',
        })
      );
    }
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <TimeRangePicker setTimeRange={setTimeRange} timeRange={timeRange} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FullTimeRangeSelector
                frozenDataPreference={frozenDataPreference}
                setFrozenDataPreference={setFrozenDataPreference}
                dataView={dataSourceContext.selectedDataView}
                query={dataSourceContext.combinedQuery}
                disabled={false}
                callback={fullTimeRangeCallback}
                timefilter={timefilter}
                apiPath={`${ML_INTERNAL_BASE_PATH}/fields_service/time_field_range`}
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
            loading={loadingData}
          />

          <WizardNav
            next={() =>
              setCurrentStep(
                jobCreator.type === JOB_TYPE.ADVANCED
                  ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
                  : WIZARD_STEPS.PICK_FIELDS
              )
            }
            nextActive={true}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
