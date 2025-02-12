/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  useEuiTheme,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiIconTip,
  EuiLoadingChart,
  EuiPortal,
  EuiText,
  EuiTitle,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import type {
  CustomAnnotationTooltip,
  LineAnnotationDatum,
  LineAnnotationEvent,
  RectAnnotationDatum,
  RectAnnotationEvent,
} from '@elastic/charts';
import {
  AnnotationDomainType,
  Axis,
  Chart,
  CurveType,
  LEGACY_LIGHT_THEME,
  LineAnnotation,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  timeFormatter,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { DATAFEED_STATE } from '../../../../../../common/constants/states';
import type {
  CombinedJobWithStats,
  MlSummaryJob,
  ModelSnapshot,
} from '../../../../../../common/types/anomaly_detection_jobs';
import type { JobMessage } from '../../../../../../common/types/audit_message';
import type { LineAnnotationDatumWithModelSnapshot } from '../../../../../../common/types/results';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { useMlApi } from '../../../../contexts/kibana';
import { RevertModelSnapshotFlyout } from '../../../../components/model_snapshots/revert_model_snapshot_flyout';
import { JobMessagesPane } from '../job_details/job_messages_pane';
import { EditQueryDelay } from './edit_query_delay';
import type { ChartDirectionType } from './constants';
import { CHART_DIRECTION, CHART_SIZE } from './constants';
import { loadFullJob } from '../utils';
import { checkPermission } from '../../../../capabilities/check_capabilities';
import { type ChartDataWithNullValues, fillMissingChartData } from './fill_missing_chart_data';

const dateFormatter = timeFormatter('MM-DD HH:mm:ss');
const MAX_CHART_POINTS = 480;
const revertSnapshotMessage = i18n.translate(
  'xpack.ml.jobsList.datafeedChart.revertSnapshotMessage',
  {
    defaultMessage: 'Click to revert to this model snapshot.',
  }
);
const notAvailableMessage = i18n.translate('xpack.ml.jobsList.datafeedChart.notAvailableMessage', {
  defaultMessage: 'N/A',
});

interface DatafeedChartFlyoutProps {
  jobId: string;
  end: number;
  onClose: () => void;
  onModelSnapshotAnnotationClick?: (modelSnapshot: ModelSnapshot) => void;
}

function setLineAnnotationHeader(
  lineDatum: LineAnnotationDatum | LineAnnotationDatumWithModelSnapshot
) {
  lineDatum.header = dateFormatter(lineDatum.dataValue);
  return lineDatum;
}

const customTooltip: CustomAnnotationTooltip = ({ details, datum }) => (
  <div className="echAnnotation__tooltip">
    {/* @ts-ignore 'header does not exist on type RectAnnotationDatum' */}
    <p className="echAnnotation__header">{dateFormatter(datum.header)}</p>
    <div className="echAnnotation__details">{details}</div>
  </div>
);

export const DatafeedChartFlyout: FC<DatafeedChartFlyoutProps> = ({
  jobId,
  end,
  onClose,
  onModelSnapshotAnnotationClick,
}) => {
  const mlApi = useMlApi();
  const [data, setData] = useState<{
    datafeedConfig: CombinedJobWithStats['datafeed_config'] | undefined;
    bucketSpan: string | undefined;
    isInitialized: boolean;
    modelSnapshotData: LineAnnotationDatumWithModelSnapshot[];
  }>({
    datafeedConfig: undefined,
    bucketSpan: undefined,
    isInitialized: false,
    modelSnapshotData: [],
  });
  const [endDate, setEndDate] = useState<any>(moment(end));
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(false);
  const [bucketData, setBucketData] = useState<ChartDataWithNullValues>([]);
  const [annotationData, setAnnotationData] = useState<{
    rect: RectAnnotationDatum[];
    line: LineAnnotationDatum[];
  }>({ rect: [], line: [] });
  const [modelSnapshotDataForTimeRange, setModelSnapshotDataForTimeRange] = useState<
    LineAnnotationDatumWithModelSnapshot[]
  >([]);
  const [messageData, setMessageData] = useState<LineAnnotationDatum[]>([]);
  const [sourceData, setSourceData] = useState<ChartDataWithNullValues>([]);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showModelSnapshots, setShowModelSnapshots] = useState<boolean>(false);
  const [range, setRange] = useState<{ start: string; end: string } | undefined>();
  const canUpdateDatafeed = useMemo(() => checkPermission('canUpdateDatafeed'), []);
  const canCreateJob = useMemo(() => checkPermission('canCreateJob'), []);
  const canStartStopDatafeed = useMemo(() => checkPermission('canStartStopDatafeed'), []);

  const {
    getModelSnapshots,
    results: { getDatafeedResultChartData },
  } = useMlApi();
  const { displayErrorToast } = useToastNotificationService();
  const { euiTheme } = useEuiTheme();
  const handleChange = (date: moment.Moment) => setEndDate(date);
  const handleEndDateChange = (direction: ChartDirectionType) => {
    if (data.bucketSpan === undefined) return;

    const newEndDate = endDate.clone();
    const unitMatch = data.bucketSpan.match(/[d | h| m | s]/g)!;
    const unit = unitMatch[0];
    const count = Number(data.bucketSpan.replace(/[^0-9]/g, ''));

    if (direction === CHART_DIRECTION.FORWARD) {
      newEndDate.add(MAX_CHART_POINTS * count, unit);
    } else {
      newEndDate.subtract(MAX_CHART_POINTS * count, unit);
    }
    setEndDate(newEndDate);
  };

  const getChartData = useCallback(async () => {
    if (data.bucketSpan === undefined) return;

    const endTimestamp = moment(endDate).valueOf();
    const unitMatch = data.bucketSpan.match(/[d | h| m | s]/g)!;
    const unit = unitMatch[0];
    const count = Number(data.bucketSpan.replace(/[^0-9]/g, ''));
    // STARTTIME = ENDTIME - (BucketSpan * MAX_CHART_POINTS)
    const startMoment = endDate.clone().subtract(MAX_CHART_POINTS * count, unit);
    const startTimestamp = moment(startMoment).valueOf();
    setRange({ start: String(startTimestamp), end: String(endTimestamp) });

    try {
      const chartData = await getDatafeedResultChartData(jobId, startTimestamp, endTimestamp);
      let chartSourceData: ChartDataWithNullValues =
        chartData.datafeedResults as ChartDataWithNullValues;
      let chartBucketData: ChartDataWithNullValues =
        chartData.bucketResults as ChartDataWithNullValues;

      if (chartSourceData.length !== chartBucketData.length) {
        if (chartSourceData.length > chartBucketData.length) {
          chartBucketData = fillMissingChartData(chartBucketData, chartSourceData);
        } else {
          chartSourceData = fillMissingChartData(chartSourceData, chartBucketData);
        }
      }
      setSourceData(chartSourceData);
      setBucketData(chartBucketData);
      setAnnotationData({
        rect: chartData.annotationResultsRect,
        line: chartData.annotationResultsLine.map(setLineAnnotationHeader),
      });
      setModelSnapshotDataForTimeRange(
        data.modelSnapshotData.filter(
          (datum) => datum.dataValue >= startTimestamp && datum.dataValue <= endTimestamp
        )
      );
    } catch (error) {
      const title = i18n.translate('xpack.ml.jobsList.datafeedChart.errorToastTitle', {
        defaultMessage: 'Error fetching data',
      });
      displayErrorToast(error, title);
    }
    setIsLoadingChartData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDate, data.bucketSpan]);

  const getJobAndSnapshotData = useCallback(async () => {
    try {
      const job: CombinedJobWithStats = await loadFullJob(mlApi, jobId);
      const modelSnapshotResultsLine: LineAnnotationDatumWithModelSnapshot[] = [];
      const modelSnapshotsResp = await getModelSnapshots(jobId);
      const modelSnapshots = modelSnapshotsResp.model_snapshots ?? [];
      modelSnapshots.forEach((modelSnapshot) => {
        const timestamp = Number(modelSnapshot.latest_record_time_stamp);

        modelSnapshotResultsLine.push({
          dataValue: timestamp,
          details: `${modelSnapshot.description}. ${
            canCreateJob && canStartStopDatafeed ? revertSnapshotMessage : ''
          }`,
          modelSnapshot,
        });
      });

      setData({
        datafeedConfig: job.datafeed_config,
        // @ts-expect-error bucket_span is of type estypes.Duration
        bucketSpan: job.analysis_config.bucket_span,
        isInitialized: true,
        modelSnapshotData: modelSnapshotResultsLine.map(setLineAnnotationHeader),
      });
    } catch (error) {
      displayErrorToast(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(function loadInitialData() {
    getJobAndSnapshotData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function loadChartData() {
      if (data.bucketSpan !== undefined) {
        setIsLoadingChartData(true);
        getChartData();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endDate, data.bucketSpan]
  );

  const { datafeedConfig, bucketSpan, isInitialized } = data;
  const checkboxIdAnnotation = useMemo(() => htmlIdGenerator()(), []);
  const checkboxIdModelSnapshot = useMemo(() => htmlIdGenerator()(), []);
  const hasOnlyEmptyValues = useMemo(
    () =>
      !bucketData.some((datum) => datum[1] !== null && datum[1] !== 0) &&
      !sourceData.some((datum) => datum[1] !== null && datum[1] !== 0),
    [bucketData, sourceData]
  );

  return (
    <EuiPortal>
      <EuiFlyout
        size="m"
        ownFocus
        onClose={onClose}
        aria-label={i18n.translate('xpack.ml.jobsList.datafeedChart.datafeedChartFlyoutAriaLabel', {
          defaultMessage: 'Datafeed chart flyout',
        })}
        data-test-subj="mlAnnotationsViewDatafeedFlyout"
      >
        <EuiFlyoutHeader hasBorder data-test-subj="mlAnnotationsViewDatafeedFlyoutTitle">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xl">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    color="primary"
                    type="help"
                    content={
                      <FormattedMessage
                        id="xpack.ml.jobsList.datafeedChart.headerTooltipContent"
                        defaultMessage="Charts the event counts of the job and the source data to identify where missing data has occurred."
                      />
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h4>
                      <FormattedMessage
                        id="xpack.ml.jobsList.datafeedChart.header"
                        defaultMessage="Datafeed chart for {jobId}"
                        values={{
                          jobId,
                        }}
                      />
                    </h4>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ padding: '10px' }}>
              <EuiDatePicker
                aria-label={i18n.translate('xpack.ml.jobsList.datafeedChart.chartIntervalEndTime', {
                  defaultMessage: 'Chart interval end time',
                })}
                showTimeSelect
                selected={endDate}
                onChange={handleChange}
                popoverPlacement="leftUp"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoadingChartData || isInitialized === false ? <EuiLoadingChart size="l" /> : null}
          {!isLoadingChartData && isInitialized && datafeedConfig !== undefined && bucketSpan ? (
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EditQueryDelay
                      datafeedId={datafeedConfig.datafeed_id}
                      queryDelay={datafeedConfig.query_delay}
                      isEnabled={
                        datafeedConfig.state === DATAFEED_STATE.STOPPED && canUpdateDatafeed
                      }
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiCheckbox
                          id={checkboxIdAnnotation}
                          label={
                            <EuiText size={'xs'}>
                              <FormattedMessage
                                id="xpack.ml.jobsList.datafeedChart.showAnnotationsCheckboxLabel"
                                defaultMessage="Show annotations"
                              />
                            </EuiText>
                          }
                          checked={showAnnotations}
                          onChange={() => setShowAnnotations(!showAnnotations)}
                        />
                      </EuiFlexItem>
                      {onModelSnapshotAnnotationClick ? (
                        <EuiFlexItem grow={false}>
                          <EuiCheckbox
                            id={checkboxIdModelSnapshot}
                            label={
                              <EuiText size={'xs'}>
                                <FormattedMessage
                                  id="xpack.ml.jobsList.datafeedChart.showModelSnapshotsCheckboxLabel"
                                  defaultMessage="Show model snapshots"
                                />
                              </EuiText>
                            }
                            checked={showModelSnapshots}
                            onChange={() => setShowModelSnapshots(!showModelSnapshots)}
                          />
                        </EuiFlexItem>
                      ) : null}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.ml.jobsList.datafeedChart.chartLeftArrowTooltip"
                          defaultMessage="Previous time window"
                        />
                      }
                    >
                      <EuiButtonEmpty
                        aria-label={i18n.translate(
                          'xpack.ml.jobsList.datafeedChart.chartIntervalLeftArrow',
                          {
                            defaultMessage: 'Previous time window',
                          }
                        )}
                        color="primary"
                        onClick={() => {
                          handleEndDateChange(CHART_DIRECTION.BACK);
                        }}
                        iconType="arrowLeft"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <div data-test-subj="mlAnnotationsViewDatafeedFlyoutChart">
                      <Chart size={CHART_SIZE}>
                        <Tooltip type={TooltipType.VerticalCursor} showNullValues />
                        <Settings
                          showLegend
                          legendPosition={Position.Bottom}
                          onAnnotationClick={(annotations: {
                            rects: RectAnnotationEvent[];
                            lines: LineAnnotationEvent[];
                          }) => {
                            // If it's not a line annotation or if it's not a model snapshot annotation then do nothing
                            if (
                              !(canCreateJob && canStartStopDatafeed) ||
                              annotations.lines?.length === 0 ||
                              (annotations.lines &&
                                !annotations.lines[0].id.includes('Model snapshots'))
                            )
                              return;

                            if (
                              onModelSnapshotAnnotationClick &&
                              isPopulatedObject<string, ModelSnapshot>(
                                annotations.lines?.[0]?.datum,
                                ['modelSnapshot']
                              )
                            ) {
                              onModelSnapshotAnnotationClick(
                                annotations.lines[0].datum.modelSnapshot
                              );
                            }
                          }}
                          theme={{
                            lineSeriesStyle: {
                              point: {
                                visible: 'never',
                              },
                            },
                          }}
                          // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
                          baseTheme={LEGACY_LIGHT_THEME}
                          locale={i18n.getLocale()}
                        />
                        <Axis
                          id="bottom"
                          position={Position.Bottom}
                          showOverlappingTicks
                          tickFormat={dateFormatter}
                          title={i18n.translate('xpack.ml.jobsList.datafeedChart.xAxisTitle', {
                            defaultMessage: 'Bucket span ({bucketSpan})',
                            values: { bucketSpan },
                          })}
                        />
                        <Axis
                          id="left"
                          title={i18n.translate('xpack.ml.jobsList.datafeedChart.yAxisTitle', {
                            defaultMessage: 'Count',
                          })}
                          position={Position.Left}
                          domain={
                            hasOnlyEmptyValues
                              ? {
                                  min: 0,
                                  max: 10,
                                }
                              : undefined
                          }
                          tickFormat={(d) => (d === null ? notAvailableMessage : String(d))}
                        />
                        {showAnnotations ? (
                          <>
                            <LineAnnotation
                              id={i18n.translate(
                                'xpack.ml.jobsList.datafeedChart.annotationLineSeriesId',
                                {
                                  defaultMessage: 'Annotations line result',
                                }
                              )}
                              key="annotation-results-line"
                              domainType={AnnotationDomainType.XDomain}
                              dataValues={annotationData.line}
                              marker={<EuiIcon type="annotation" />}
                              markerPosition={Position.Top}
                              style={{
                                line: {
                                  strokeWidth: 3,
                                  stroke: euiTheme.colors.textDanger,
                                  opacity: 0.5,
                                },
                              }}
                            />
                            <RectAnnotation
                              key="annotation-results-rect"
                              customTooltip={customTooltip}
                              dataValues={annotationData.rect}
                              id={i18n.translate(
                                'xpack.ml.jobsList.datafeedChart.annotationRectSeriesId',
                                {
                                  defaultMessage: 'Annotations rectangle result',
                                }
                              )}
                              style={{ fill: euiTheme.colors.textDanger }}
                            />
                          </>
                        ) : null}
                        {showModelSnapshots ? (
                          <LineAnnotation
                            id={i18n.translate(
                              'xpack.ml.jobsList.datafeedChart.modelSnapshotsLineSeriesId',
                              {
                                defaultMessage: 'Model snapshots',
                              }
                            )}
                            key="model-snapshots-results-line"
                            domainType={AnnotationDomainType.XDomain}
                            dataValues={modelSnapshotDataForTimeRange}
                            marker={<EuiIcon type="asterisk" />}
                            markerPosition={Position.Top}
                            style={{
                              line: {
                                strokeWidth: 3,
                                // Amsterdam: euiTheme.colors.vis.euiColorVis1
                                // Borealis:  euiTheme.colors.vis.euiColorVis2
                                stroke: euiTheme.flags.hasVisColorAdjustment
                                  ? euiTheme.colors.vis.euiColorVis1
                                  : euiTheme.colors.vis.euiColorVis2,
                                opacity: 0.5,
                              },
                            }}
                          />
                        ) : null}
                        {messageData.length > 0 ? (
                          <>
                            <LineAnnotation
                              id={i18n.translate(
                                'xpack.ml.jobsList.datafeedChart.messageLineAnnotationId',
                                {
                                  defaultMessage: 'Job messages line result',
                                }
                              )}
                              key="messages-results-line"
                              domainType={AnnotationDomainType.XDomain}
                              dataValues={messageData}
                              marker={<EuiIcon type="tableDensityNormal" />}
                              markerPosition={Position.Top}
                              style={{
                                line: {
                                  strokeWidth: 3,
                                  stroke: euiTheme.colors.accent,
                                  opacity: 0.5,
                                },
                              }}
                            />
                          </>
                        ) : null}
                        <LineSeries
                          key={'source-results'}
                          color={euiTheme.colors.primary}
                          id={i18n.translate('xpack.ml.jobsList.datafeedChart.sourceSeriesId', {
                            defaultMessage: 'Source indices document count',
                          })}
                          xScaleType={ScaleType.Time}
                          yScaleType={ScaleType.Linear}
                          xAccessor={0}
                          yAccessors={[1]}
                          data={sourceData}
                          curve={CurveType.LINEAR}
                        />
                        <LineSeries
                          key={'job-results'}
                          color={euiTheme.colors.textAccent}
                          id={i18n.translate('xpack.ml.jobsList.datafeedChart.bucketSeriesId', {
                            defaultMessage: 'Datafeed document count',
                          })}
                          xScaleType={ScaleType.Time}
                          yScaleType={ScaleType.Linear}
                          xAccessor={0}
                          yAccessors={[1]}
                          data={bucketData}
                          curve={CurveType.LINEAR}
                        />
                      </Chart>
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.ml.jobsList.datafeedChart.chartRightArrowTooltip"
                          defaultMessage="Next time window"
                        />
                      }
                    >
                      <EuiButtonEmpty
                        aria-label={i18n.translate(
                          'xpack.ml.jobsList.datafeedChart.chartIntervalRightArrow',
                          {
                            defaultMessage: 'Next time window',
                          }
                        )}
                        color="primary"
                        onClick={() => {
                          handleEndDateChange(CHART_DIRECTION.FORWARD);
                        }}
                        iconType="arrowRight"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {range !== undefined ? (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="column">
                    <EuiTitle size="xs">
                      <h4>
                        <FormattedMessage
                          id="xpack.ml.jobsList.datafeedChart.messagesTableTitle"
                          defaultMessage="Job messages"
                        />
                      </h4>
                    </EuiTitle>
                    <JobMessagesPane
                      jobId={jobId}
                      {...range}
                      actionHandler={function toggleChartMessage(message: JobMessage) {
                        if (
                          messageData.length > 0 &&
                          messageData[0].dataValue === message.timestamp
                        ) {
                          setMessageData([]);
                        } else {
                          const datum = setLineAnnotationHeader({
                            dataValue: message.timestamp,
                            details: message.message,
                          });

                          setMessageData([datum]);
                        }
                      }}
                    />
                  </EuiFlexGroup>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          ) : null}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};

type ShowFunc = (jobUpdate: MlSummaryJob) => void;

interface JobListDatafeedChartFlyoutProps {
  setShowFunction: (showFunc: ShowFunc) => void;
  unsetShowFunction: () => void;
  refreshJobs(): void;
}

/**
 * Component to wire the datafeed chart flyout with the Job list view.
 * @param setShowFunction function to show the flyout
 * @param unsetShowFunction function called when flyout is closed
 * @param refreshJobs function to refresh the jobs list
 * @constructor
 */
export const JobListDatafeedChartFlyout: FC<JobListDatafeedChartFlyoutProps> = ({
  setShowFunction,
  unsetShowFunction,
  refreshJobs,
}) => {
  const mlApi = useMlApi();
  const [isVisible, setIsVisible] = useState(false);
  const [job, setJob] = useState<MlSummaryJob | undefined>();
  const [jobWithStats, setJobWithStats] = useState<CombinedJobWithStats | undefined>();

  const [isRevertModelSnapshotFlyoutVisible, setIsRevertModelSnapshotFlyoutVisible] =
    useState(false);
  const [snapshot, setSnapshot] = useState<ModelSnapshot | null>(null);

  const showFlyoutCallback = useCallback((jobUpdate: MlSummaryJob) => {
    setJob(jobUpdate);
    setIsVisible(true);
  }, []);

  const showRevertModelSnapshot = useCallback(async () => {
    // Need to load the full job with stats, as the model snapshot
    // flyout needs the timestamp of the last result.
    const fullJob: CombinedJobWithStats = await loadFullJob(mlApi, job!.id);
    setJobWithStats(fullJob);
    setIsRevertModelSnapshotFlyoutVisible(true);
    // exclude mlApi from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  useEffect(() => {
    setShowFunction(showFlyoutCallback);
    return () => {
      unsetShowFunction();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isVisible === true && job !== undefined) {
    return (
      <DatafeedChartFlyout
        onClose={() => setIsVisible(false)}
        onModelSnapshotAnnotationClick={(modelSnapshot) => {
          setIsVisible(false);
          setSnapshot(modelSnapshot);
          showRevertModelSnapshot();
        }}
        end={job.latestResultsTimestampMs || Date.now()}
        jobId={job.id}
      />
    );
  }

  if (
    isRevertModelSnapshotFlyoutVisible === true &&
    jobWithStats !== undefined &&
    snapshot !== null
  ) {
    return (
      <RevertModelSnapshotFlyout
        snapshot={snapshot}
        snapshots={[snapshot]}
        job={jobWithStats}
        closeFlyout={() => {
          setIsRevertModelSnapshotFlyoutVisible(false);
        }}
        refresh={refreshJobs}
      />
    );
  }

  return null;
};
