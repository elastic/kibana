/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ESQLLangEditor } from '@kbn/esql/public';
import {
  FROZEN_TIER_PREFERENCE,
  FullTimeRangeSelector,
  useTimefilter,
  type GetTimeFieldRangeResponse,
} from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';
import {
  ML_FROZEN_TIER_PREFERENCE,
  type MlStorageKey,
  type TMlStorageMapped,
} from '@kbn/ml-common-types/storage';
import {
  getESQLAdHocDataview,
  getESQLQueryColumnsRaw,
  getProjectRoutingFromEsqlQuery,
} from '@kbn/esql-utils';
import { ML_INTERNAL_BASE_PATH } from '../../../../../../../common/constants/app';
import { WizardNav } from '../wizard_nav';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import {
  isEsqlJobCreator,
  isEsqlAdvancedJobCreator,
  isEsqlBasicJobCreator,
} from '../../../common/job_creator';
import { convertToEsqlAdvancedJob } from '../../../common/job_creator/util/general';
import { useNavigateToManagementMlLink } from '../../../../../contexts/kibana/use_create_url';
import type { TimeRange } from '../../../common/components';
import { TimeRangePicker } from '../../../common/components';
import { useEsqlTimeField } from './use_esql_time_field';
import { extractSourceQuery } from './extract_source_query';
import { getEsqlSummaryCountField } from './get_esql_summary_count_field';
import { validateEsqlQuery, type EsqlQueryProblem } from './validate_esql_query';
import { getEsqlBucketSpan, getEsqlColumnFunctions } from './esql_stats_columns';
import { useEsqlQueryExecution } from './use_esql_query_execution';
import { EsqlResultsTable } from './esql_results_table';
import { useMlKibana } from '../../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

const QueryProblemList: FC<{ problems: readonly EsqlQueryProblem[] }> = ({ problems }) => (
  <ul>
    {problems.map((problem, index) => (
      <li key={index}>
        <QueryProblemMessage problem={problem} />
      </li>
    ))}
  </ul>
);

const QueryProblemMessage: FC<{ problem: EsqlQueryProblem }> = ({ problem }) => {
  const expression = <EuiCode>{problem.expression}</EuiCode>;
  switch (problem.type) {
    case 'unnamedColumn':
      return (
        <FormattedMessage
          id="xpack.ml.newJob.wizard.esqlQueryStep.unnamedColumnProblem"
          defaultMessage="Name the column created by {expression}, for example {example}."
          values={{
            expression,
            example: <EuiCode>{`my_column = ${problem.expression}`}</EuiCode>,
          }}
        />
      );
    case 'unsupportedStatsColumn':
      return problem.severity === 'warning' ? (
        <FormattedMessage
          id="xpack.ml.newJob.wizard.esqlQueryStep.unsupportedStatsColumnWarning"
          defaultMessage="{expression} has no matching ML function, so every function its type supports is offered. Check that the function you pick suits the column."
          values={{ expression }}
        />
      ) : (
        <FormattedMessage
          id="xpack.ml.newJob.wizard.esqlQueryStep.unsupportedStatsColumnProblem"
          defaultMessage="{expression} is not supported. Each column of the last {stats} command must be {count} or a single {functions}, with no filter."
          values={{
            expression,
            stats: <EuiCode>STATS</EuiCode>,
            count: <EuiCode>COUNT(*)</EuiCode>,
            functions: <EuiCode>AVG, MAX, MEDIAN, MIN, SUM</EuiCode>,
          }}
        />
      );
    case 'changedAfterStats':
      return problem.severity === 'warning' ? (
        <FormattedMessage
          id="xpack.ml.newJob.wizard.esqlQueryStep.changedAfterStatsWarning"
          defaultMessage="{expression} changes columns after the last {stats} command. Check that the functions you pick suit the changed columns."
          values={{ expression, stats: <EuiCode>STATS</EuiCode> }}
        />
      ) : (
        <FormattedMessage
          id="xpack.ml.newJob.wizard.esqlQueryStep.changedAfterStatsProblem"
          defaultMessage="Remove {expression}, or move it before the last {stats} command. Its columns cannot be changed afterwards."
          values={{ expression, stats: <EuiCode>STATS</EuiCode> }}
        />
      );
  }
};

export const EsqlQueryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const {
    services: { data, http },
  } = useMlKibana();
  const { displayErrorToast } = useToastNotificationService();
  const { jobCreator, jobCreatorUpdate, chartLoader, chartInterval } =
    useContext(JobCreatorContext);
  const [isCreatingDataView, setIsCreatingDataView] = useState(false);

  const [query, setQuery] = useState<AggregateQuery>({
    esql: isEsqlJobCreator(jobCreator) ? jobCreator.esqlQuery : '',
  });
  const [timeField, setTimeField] = useState(jobCreator.timeFieldName);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: jobCreator.start,
    end: jobCreator.end,
  });

  const projectRouting =
    getProjectRoutingFromEsqlQuery(query.esql) ?? jobCreator.projectRouting ?? undefined;

  const onTextLangQueryChange = useCallback(
    (value: AggregateQuery) => {
      setQuery(value);
      if (isEsqlJobCreator(jobCreator)) {
        jobCreator.esqlQuery = value.esql;
        jobCreatorUpdate();
      }
    },
    [jobCreator, jobCreatorUpdate]
  );

  // This step replaces the time range step, so it sets the chart interval's bounds. Without them
  // the interval is zero, which breaks the results charts when the job runs.
  useEffect(() => {
    chartInterval.setBounds({ min: moment(timeRange.start), max: moment(timeRange.end) });
  }, [chartInterval, timeRange]);

  const onTimeFieldChange = useCallback(
    (value: string) => {
      setTimeField(value);
      jobCreator.timeFieldName = value;
      jobCreatorUpdate();
    },
    [jobCreator, jobCreatorUpdate]
  );

  const onTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      jobCreator.setTimeRange(range.start, range.end);
      jobCreatorUpdate();
    },
    [jobCreator, jobCreatorUpdate]
  );

  const { timeFieldOptions, hasSourceQuery } = useEsqlTimeField({
    query: query.esql,
    timeField,
    onTimeFieldChange,
    projectRouting,
  });
  const currentTimeFieldIsOption = timeFieldOptions.some(({ value }) => value === timeField);

  const timefilter = useTimefilter();
  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    MlStorageKey,
    TMlStorageMapped<typeof ML_FROZEN_TIER_PREFERENCE>
  >(
    ML_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  // The "Use full data" button needs a data view, so build a temporary one from the
  // query's source command and the selected time field as soon as both are known.
  const sourceQuery = useMemo(() => extractSourceQuery(query.esql), [query.esql]);
  const [sourceDataView, setSourceDataView] = useState<DataView | null>(null);
  useEffect(() => {
    if (sourceQuery === '' || !currentTimeFieldIsOption) {
      setSourceDataView(null);
      return;
    }
    let cancelled = false;
    getESQLAdHocDataview({
      dataViewsService: data.dataViews,
      query: sourceQuery,
      http,
      projectRouting,
    })
      .then((dataView) => {
        if (!cancelled) {
          dataView.timeFieldName = timeField;
          setSourceDataView(dataView);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSourceDataView(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sourceQuery, timeField, currentTimeFieldIsOption, data.dataViews, http, projectRouting]);

  const isAdvanced = isEsqlAdvancedJobCreator(jobCreator);
  const queryProblems = useMemo(
    () => validateEsqlQuery(query.esql, { isAdvanced }),
    [query.esql, isAdvanced]
  );
  const queryErrors = queryProblems.filter(({ severity }) => severity === 'error');
  const queryWarnings = queryProblems.filter(({ severity }) => severity === 'warning');
  // the advanced wizard can use the query when its only errors are columns it allows
  const isUsableWhenAdvanced =
    isAdvanced === false && queryErrors.every(({ type }) => type !== 'unnamedColumn');

  const navigateToMlManagement = useNavigateToManagementMlLink('anomaly_detection');
  const convertToAdvanced = useCallback(() => {
    if (isEsqlBasicJobCreator(jobCreator)) {
      jobCreator.esqlQuery = query.esql;
      convertToEsqlAdvancedJob(jobCreator, navigateToMlManagement);
    }
  }, [jobCreator, query.esql, navigateToMlManagement]);

  const execution = useEsqlQueryExecution(jobCreator);
  const { run, isLoading } = execution;

  const runQueryForRange = useCallback(
    ({ start, end }: TimeRange) => {
      run({
        query: query.esql,
        timeField,
        timeRange: { from: new Date(start).toISOString(), to: new Date(end).toISOString() },
        projectRouting,
      });
    },
    [run, query.esql, timeField, projectRouting]
  );

  const runQuery = useCallback(async () => {
    runQueryForRange(timeRange);
  }, [runQueryForRange, timeRange]);

  // "Use full data" sets the range to all the data, so show the results for it straight away
  const fullTimeRangeCallback = useCallback(
    (range: GetTimeFieldRangeResponse) => {
      if (range.start !== null && range.end !== null) {
        const fullRange = { start: range.start.epoch, end: range.end.epoch };
        onTimeRangeChange(fullRange);
        runQueryForRange(fullRange);
      }
    },
    [onTimeRangeChange, runQueryForRange]
  );

  const onNext = useCallback(async () => {
    if (!isEsqlJobCreator(jobCreator)) {
      return;
    }
    setIsCreatingDataView(true);
    try {
      jobCreator.esqlQuery = query.esql;
      // a query that aggregates with STATS returns one row per group, with its document count
      jobCreator.summaryCountFieldName = getEsqlSummaryCountField(query.esql);
      // the job's buckets must match the query's, e.g. 1h for BUCKET(@timestamp, 1 hour)
      jobCreator.setBucketSpanFromQuery(getEsqlBucketSpan(query.esql, timeField));
      const dataView = await getESQLAdHocDataview({
        dataViewsService: data.dataViews,
        query: query.esql,
        http,
        projectRouting,
      });
      if (timeField !== '') {
        dataView.timeFieldName = timeField;
      }
      jobCreator.indexPattern = dataView;
      chartLoader.setDataView(dataView);
      chartLoader.setEsqlQuery(query.esql, data.search, jobCreator.summaryCountFieldName);
      // The field and aggregation lists in the Choose fields step come from this service,
      // so fill it with the query's output columns rather than the source index's fields.
      const columns = await getESQLQueryColumnsRaw({
        esqlQuery: query.esql,
        search: data.search.search,
        projectRouting,
      });
      // a column created by an aggregation only allows the ML functions that match it,
      // e.g. mean, high_mean and low_mean for AVG
      jobCreator.setEsqlColumns(columns, getEsqlColumnFunctions(query.esql));
      jobCreatorUpdate();
      setCurrentStep(WIZARD_STEPS.PICK_FIELDS);
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.createDataViewError', {
          defaultMessage: 'Unable to create a data view for the ES|QL query',
        })
      );
    }
    setIsCreatingDataView(false);
  }, [
    jobCreator,
    jobCreatorUpdate,
    chartLoader,
    query.esql,
    data.dataViews,
    data.search,
    http,
    projectRouting,
    timeField,
    setCurrentStep,
    displayErrorToast,
  ]);

  if (!isCurrentStep) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <TimeRangePicker timeRange={timeRange} setTimeRange={onTimeRangeChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FullTimeRangeSelector
            frozenDataPreference={frozenDataPreference}
            setFrozenDataPreference={setFrozenDataPreference}
            dataView={sourceDataView ?? undefined}
            disabled={false}
            callback={fullTimeRangeCallback}
            timefilter={timefilter}
            apiPath={`${ML_INTERNAL_BASE_PATH}/fields_service/time_field_range`}
            projectRouting={projectRouting}
          />
        </EuiFlexItem>
        {/* wide enough to show the prepend label and a typical field name before one is picked */}
        <EuiFlexItem grow={false} css={{ minWidth: 180 }}>
          <EuiSelect
            options={timeFieldOptions}
            value={currentTimeFieldIsOption ? timeField : ''}
            hasNoInitialSelection={!currentTimeFieldIsOption}
            isInvalid={hasSourceQuery && !currentTimeFieldIsOption}
            onChange={(e) => onTimeFieldChange(e.target.value)}
            prepend={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.timeFieldLabel', {
              defaultMessage: 'Time field',
            })}
            aria-label={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.timeFieldAriaLabel', {
              defaultMessage: 'Time field for the job',
            })}
            data-test-subj="mlEsqlQueryTimeField"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.searchTooltip', {
              defaultMessage: 'Search ({shortcut})',
              values: { shortcut: RUN_SHORTCUT_LABEL },
            })}
          >
            <EuiButton
              iconType="magnify"
              onClick={runQuery}
              isLoading={isLoading}
              isDisabled={query.esql.trim() === ''}
              data-test-subj="mlEsqlQueryRunButton"
            >
              {i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.searchButtonLabel', {
                defaultMessage: 'Search',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              isAdvanced
                ? undefined
                : i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.advancedModeTooltip', {
                    defaultMessage:
                      'Choose any function and the by, over and partition fields of each detector. You cannot switch back.',
                  })
            }
          >
            <EuiSwitch
              label={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.advancedModeLabel', {
                defaultMessage: 'Advanced',
              })}
              checked={isAdvanced}
              disabled={isAdvanced}
              onChange={convertToAdvanced}
              data-test-subj="mlEsqlQueryAdvancedModeSwitch"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ESQLLangEditor
        query={query}
        onTextLangQueryChange={onTextLangQueryChange}
        onTextLangQuerySubmit={runQuery}
        hideRunQueryButton
        editorIsInline
        hasOutline
        isLoading={isLoading}
        dataTestSubj="mlJobWizardEsqlQueryEditor"
      />
      {queryErrors.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.queryProblemsTitle', {
              defaultMessage: 'This query cannot be used for an anomaly detection job',
            })}
            data-test-subj="mlEsqlQueryProblemsCallout"
            actionProps={
              isUsableWhenAdvanced
                ? {
                    primary: {
                      children: i18n.translate(
                        'xpack.ml.newJob.wizard.esqlQueryStep.useAdvancedModeButton',
                        { defaultMessage: 'Use advanced mode' }
                      ),
                      onClick: convertToAdvanced,
                      'data-test-subj': 'mlEsqlQueryUseAdvancedModeButton',
                    },
                  }
                : undefined
            }
          >
            <QueryProblemList problems={queryErrors} />
          </KbnWarningCallout>
        </>
      )}
      {queryWarnings.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.ml.newJob.wizard.esqlQueryStep.queryWarningsTitle', {
              defaultMessage: 'Check these columns before creating the job',
            })}
            data-test-subj="mlEsqlQueryWarningsCallout"
          >
            <QueryProblemList problems={queryWarnings} />
          </KbnWarningCallout>
        </>
      )}
      <EuiSpacer />
      <EsqlResultsTable execution={execution} />
      <EuiSpacer />
      <WizardNav
        next={onNext}
        nextActive={query.esql.trim() !== '' && queryErrors.length === 0 && !isCreatingDataView}
      />
    </>
  );
};
