/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import {
  AnnotationDomainTypes,
  Axis,
  getAnnotationId,
  getAxisId,
  getSpecId,
  Chart,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { TimeBuckets } from 'ui/time_buckets';
import dateMath from '@elastic/datemath';
import chrome from 'ui/chrome';
import moment from 'moment-timezone';
import { EuiCallOut, EuiLoadingChart, EuiSpacer, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { VisualizeOptions } from 'plugins/watcher/models/visualize_options';
import { ThresholdWatch } from 'plugins/watcher/models/watch/threshold_watch';
import { npStart } from 'ui/new_platform';
import { getThresholdAlertVisualizationData } from '../../../../lib/api';
import { AlertsContext } from '../../../../context/alerts_context';
import { comparators, aggregationTypes } from './expression';
import { useAppDependencies } from '../../../..';
import { SectionError } from '../../../../components/page_error/section_error';

const customTheme = () => {
  return {
    lineSeriesStyle: {
      line: {
        strokeWidth: 3,
      },
      point: {
        visible: false,
      },
    },
  };
};

const getTimezone = () => {
  const config = chrome.getUiSettingsClient();
  const DATE_FORMAT_CONFIG_KEY = 'dateFormat:tz';
  const isCustomTimezone = !config.isDefault(DATE_FORMAT_CONFIG_KEY);
  if (isCustomTimezone) {
    return config.get(DATE_FORMAT_CONFIG_KEY);
  }

  const detectedTimezone = moment.tz.guess();
  if (detectedTimezone) {
    return detectedTimezone;
  }
  // default to UTC if we can't figure out the timezone
  const tzOffset = moment().format('Z');
  return tzOffset;
};

const getDomain = (watch: any) => {
  const VISUALIZE_TIME_WINDOW_MULTIPLIER = 5;
  const fromExpression = `now-${watch.timeWindowSize * VISUALIZE_TIME_WINDOW_MULTIPLIER}${
    watch.timeWindowUnit
  }`;
  const toExpression = 'now';
  const fromMoment = dateMath.parse(fromExpression);
  const toMoment = dateMath.parse(toExpression);
  const visualizeTimeWindowFrom = fromMoment ? fromMoment.valueOf() : 0;
  const visualizeTimeWindowTo = toMoment ? toMoment.valueOf() : 0;
  return {
    min: visualizeTimeWindowFrom,
    max: visualizeTimeWindowTo,
  };
};

const getThreshold = (watch: any) => {
  return watch.threshold.slice(0, comparators[watch.thresholdComparator].requiredValues);
};

const getTimeBuckets = (watch: any) => {
  const domain = getDomain(watch);
  const timeBuckets = new TimeBuckets();
  timeBuckets.setBounds(domain);
  return timeBuckets;
};

export const ThresholdVisualization = () => {
  const {
    core: { http },
  } = useAppDependencies();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialRequest, setIsInitialRequest] = useState(false);
  const [error, setError] = useState<undefined | any>(undefined);
  const [visualizationData, setVisualizationData] = useState<Record<string, any>>([]);

  const { alert } = useContext(AlertsContext);
  const chartsTheme = npStart.plugins.eui_utils.useChartsTheme();
  const {
    index,
    timeField,
    triggerIntervalSize,
    triggerIntervalUnit,
    aggType,
    aggField,
    termSize,
    termField,
    thresholdComparator,
    timeWindowSize,
    timeWindowUnit,
    groupBy,
    threshold,
  } = alert.alertTypeParams;

  const domain = getDomain(alert);
  const timeBuckets = new TimeBuckets();
  timeBuckets.setBounds(domain);
  const interval = timeBuckets.getInterval().expression;
  const visualizeOptions = new VisualizeOptions({
    rangeFrom: domain.min,
    rangeTo: domain.max,
    interval,
    timezone: getTimezone(),
  });

  // Fetching visualization data is independent of alert actions
  const watchWithoutActions = new ThresholdWatch({ ...alert, actions: [] });

  useEffect(() => {
    // Prevent sending a second request on initial render.
    if (isInitialRequest) {
      return;
    }

    async function loadVisualizationData() {
      setIsLoading(true);
      setVisualizationData(
        await getThresholdAlertVisualizationData({
          model: watchWithoutActions,
          visualizeOptions,
          http,
        })
      );
    }
    loadVisualizationData();
  }, [
    index,
    timeField,
    triggerIntervalSize,
    triggerIntervalUnit,
    aggType,
    aggField,
    termSize,
    termField,
    thresholdComparator,
    timeWindowSize,
    timeWindowUnit,
    groupBy,
    threshold,
    isInitialRequest,
    watchWithoutActions,
    visualizeOptions,
    http,
  ]);

  if (isInitialRequest && isLoading) {
    return (
      <EuiEmptyPrompt
        title={<EuiLoadingChart size="xl" />}
        body={
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.loadingWatchVisualizationDescription"
              defaultMessage="Loading watch visualization…"
            />
          </EuiText>
        }
      />
    );
  }

  if (error) {
    return (
      <Fragment>
        <EuiSpacer size="l" />
        <SectionError
          title={
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.errorLoadingWatchVisualizationTitle"
              defaultMessage="Cannot load watch visualization"
            />
          }
          error={error}
        />
        <EuiSpacer size="l" />
      </Fragment>
    );
  }

  if (visualizationData) {
    const watchVisualizationDataKeys = Object.keys(visualizationData);
    const timezone = getTimezone();
    const actualThreshold = getThreshold(alert);
    let maxY = actualThreshold[actualThreshold.length - 1];

    (Object.values(visualizationData) as number[][][]).forEach(data => {
      data.forEach(([, y]) => {
        if (y > maxY) {
          maxY = y;
        }
      });
    });
    const dateFormatter = (d: number) => {
      return moment(d)
        .tz(timezone)
        .format(getTimeBuckets(alert).getScaledDateFormat());
    };
    const aggLabel = aggregationTypes[alert.alertTypeParams.aggType].text;
    return (
      <div data-test-subj="watchVisualizationChart">
        <EuiSpacer size="l" />
        {watchVisualizationDataKeys.length ? (
          <Chart size={['100%', 300]} renderer="canvas">
            <Settings
              theme={[customTheme(), chartsTheme]}
              xDomain={domain}
              showLegend={!!alert.alertTypeParams.termField}
              legendPosition={Position.Bottom}
            />
            <Axis
              id={getAxisId('bottom')}
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={dateFormatter}
            />
            <Axis
              domain={{ max: maxY }}
              id={getAxisId('left')}
              title={aggLabel}
              position={Position.Left}
            />
            {watchVisualizationDataKeys.map((key: string) => {
              return (
                <LineSeries
                  key={key}
                  id={getSpecId(key)}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  data={visualizationData[key]}
                  xAccessor={0}
                  yAccessors={[1]}
                  timeZone={timezone}
                />
              );
            })}
            {actualThreshold.map((_value: any, i: number) => {
              const specId = i === 0 ? 'threshold' : `threshold${i}`;
              return (
                <LineAnnotation
                  key={specId}
                  annotationId={getAnnotationId(specId)}
                  domainType={AnnotationDomainTypes.YDomain}
                  dataValues={[{ dataValue: alert.alertTypeParams.threshold[i], details: specId }]}
                />
              );
            })}
          </Chart>
        ) : (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.watcher.thresholdPreviewChart.noDataTitle"
                defaultMessage="No data"
              />
            }
            color="warning"
          >
            <FormattedMessage
              id="xpack.watcher.thresholdPreviewChart.dataDoesNotExistTextMessage"
              defaultMessage="Your index and condition did not return any data."
            />
          </EuiCallOut>
        )}
        <EuiSpacer size="l" />
      </div>
    );
  }

  return null;
};
