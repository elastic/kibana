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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
import { getESQLAdHocDataview, getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import { ML_INTERNAL_BASE_PATH } from '../../../../../../../common/constants/app';
import { WizardNav } from '../wizard_nav';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { isEsqlJobCreator } from '../../../common/job_creator';
import type { TimeRange } from '../../../common/components';
import { TimeRangePicker } from '../../../common/components';
import { useEsqlTimeField } from './use_esql_time_field';
import { extractSourceQuery } from './extract_source_query';
import { useEsqlQueryExecution } from './use_esql_query_execution';
import { EsqlResultsTable } from './esql_results_table';
import { useMlKibana } from '../../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const EsqlQueryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const {
    services: { data, http },
  } = useMlKibana();
  const { displayErrorToast } = useToastNotificationService();
  const { jobCreator, jobCreatorUpdate, chartLoader } = useContext(JobCreatorContext);
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

  const fullTimeRangeCallback = useCallback(
    (range: GetTimeFieldRangeResponse) => {
      if (range.start !== null && range.end !== null) {
        onTimeRangeChange({ start: range.start.epoch, end: range.end.epoch });
      }
    },
    [onTimeRangeChange]
  );

  const execution = useEsqlQueryExecution();
  const { run, isLoading } = execution;

  const runQuery = useCallback(async () => {
    run({
      query: query.esql,
      timeField,
      timeRange: {
        from: new Date(timeRange.start).toISOString(),
        to: new Date(timeRange.end).toISOString(),
      },
      projectRouting,
    });
  }, [run, query.esql, timeField, timeRange, projectRouting]);

  const onNext = useCallback(async () => {
    if (!isEsqlJobCreator(jobCreator)) {
      return;
    }
    setIsCreatingDataView(true);
    try {
      jobCreator.esqlQuery = query.esql;
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
      // The field and aggregation lists in the Choose fields step come from this service.
      await jobCreator.newJobCapsService.initializeFromDataVIew(
        dataView,
        true,
        true,
        projectRouting
      );
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
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={timeFieldOptions}
            value={currentTimeFieldIsOption ? timeField : ''}
            hasNoInitialSelection={!currentTimeFieldIsOption}
            isInvalid={hasSourceQuery && !currentTimeFieldIsOption}
            onChange={(e) => onTimeFieldChange(e.target.value)}
            compressed
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
              size="s"
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
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ESQLLangEditor
        query={query}
        onTextLangQueryChange={onTextLangQueryChange}
        onTextLangQuerySubmit={runQuery}
        hideRunQueryButton
        editorIsInline
        isLoading={isLoading}
        dataTestSubj="mlJobWizardEsqlQueryEditor"
      />
      <EuiSpacer />
      <EsqlResultsTable execution={execution} runShortcutLabel={RUN_SHORTCUT_LABEL} />
      <EuiSpacer />
      <WizardNav next={onNext} nextActive={query.esql.trim() !== '' && !isCreatingDataView} />
    </>
  );
};
