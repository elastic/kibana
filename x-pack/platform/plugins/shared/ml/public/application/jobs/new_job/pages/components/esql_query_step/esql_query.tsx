/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext, useState } from 'react';
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
import { ESQLLangEditor } from '@kbn/esql/public';
import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import { WizardNav } from '../wizard_nav';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { isEsqlJobCreator } from '../../../common/job_creator';
import type { TimeRange } from '../../../common/components';
import { TimeRangePicker } from '../../../common/components';
import { useEsqlTimeField } from './use_esql_time_field';
import { useEsqlQueryExecution } from './use_esql_query_execution';
import { EsqlResultsTable } from './esql_results_table';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const EsqlQueryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);

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
              iconType="search"
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
      <WizardNav
        next={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
        nextActive={query.esql.trim() !== ''}
      />
    </>
  );
};
