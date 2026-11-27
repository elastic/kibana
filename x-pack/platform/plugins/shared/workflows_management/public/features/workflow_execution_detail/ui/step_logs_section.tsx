/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { TerminalExecutionStatuses } from '@kbn/workflows/types/latest';
import type { StepLogsApi } from '@kbn/workflows-extensions/public';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { StepDetailAccordionSection } from './step_detail_accordion_section';
import { StepLogsView } from './step_logs_view';
import { useKibana } from '../../../hooks/use_kibana';

const LOGS_PAGE_SIZE = 100;
const MAX_LOG_PAGES = 100;
const MAX_LOG_ENTRIES = LOGS_PAGE_SIZE * MAX_LOG_PAGES;

interface StepLogsSectionProps {
  stepExecution: WorkflowStepExecutionDto;
  workflowExecutionId: string;
}

/** Logs accordion for a step whose definition opts in via `logs.enabled`. */
export const StepLogsSection = React.memo<StepLogsSectionProps>(
  ({ stepExecution, workflowExecutionId }) => {
    const { workflowsExtensions } = useKibana().services;
    const api = useWorkflowsApi();
    const [isTruncated, setIsTruncated] = useState(false);
    const cancelledRef = useRef(false);
    const stepExecutionRef = useRef(stepExecution);
    stepExecutionRef.current = stepExecution;

    useEffect(() => {
      cancelledRef.current = false;
      setIsTruncated(false);
      return () => {
        cancelledRef.current = true;
      };
    }, [workflowExecutionId, stepExecution.id]);

    const logsConfig = useMemo(
      () =>
        stepExecution.stepType
          ? workflowsExtensions.getStepDefinition(stepExecution.stepType)?.logs
          : undefined,
      [stepExecution.stepType, workflowsExtensions]
    );

    const logsApi = useMemo<StepLogsApi>(() => {
      // While the step is still running, late-indexed earlier timestamps can shift offset
      // pages, so every poll re-reads from page 1. After the step finishes, full pages are
      // stable and each call resumes from the last (possibly partial) page.
      const cachedLogs: Awaited<ReturnType<typeof api.getExecutionLogs>>['logs'] = [];
      return {
        fetchLogs: async () => {
          if (!stepExecution.id) return [];
          if (cancelledRef.current) return cachedLogs.slice();

          const isTerminal = TerminalExecutionStatuses.includes(stepExecutionRef.current.status);
          const startPage = isTerminal ? Math.floor(cachedLogs.length / LOGS_PAGE_SIZE) + 1 : 1;
          const allLogs = isTerminal ? cachedLogs.slice(0, (startPage - 1) * LOGS_PAGE_SIZE) : [];

          for (let page = startPage; page <= MAX_LOG_PAGES; page++) {
            if (cancelledRef.current) {
              return allLogs;
            }
            const response = await api.getExecutionLogs(workflowExecutionId, {
              stepExecutionId: stepExecution.id,
              sortOrder: 'asc',
              size: LOGS_PAGE_SIZE,
              page,
            });
            if (cancelledRef.current) {
              return allLogs;
            }
            allLogs.push(...response.logs);
            if (response.logs.length === 0 || allLogs.length >= response.total) {
              if (!cancelledRef.current) {
                setIsTruncated(false);
              }
              break;
            }
            if (page === MAX_LOG_PAGES && allLogs.length < response.total) {
              if (!cancelledRef.current) {
                setIsTruncated(true);
              }
              break;
            }
          }

          if (!cancelledRef.current) {
            cachedLogs.splice(0, cachedLogs.length, ...allLogs);
          }
          return allLogs.slice(0, MAX_LOG_ENTRIES);
        },
      };
    }, [api, workflowExecutionId, stepExecution.id]);

    if (!logsConfig?.enabled) {
      return null;
    }

    return (
      <StepDetailAccordionSection
        title={i18n.translate('workflows.executionFlyout.stepDetail.logs', {
          defaultMessage: 'Logs',
        })}
        data-test-subj="workflowExecutionStepLogs"
      >
        {isTruncated && (
          <EuiText color="subdued" size="s" css={{ marginBottom: 8 }}>
            <p data-test-subj="workflowExecutionStepLogsTruncated">
              {i18n.translate('workflows.executionFlyout.stepDetail.logsTruncated', {
                defaultMessage: 'Showing the first {max} log entries. Later output is not loaded.',
                values: { max: MAX_LOG_ENTRIES },
              })}
            </p>
          </EuiText>
        )}
        <StepLogsView stepExecution={stepExecution} config={logsConfig} logsApi={logsApi} />
      </StepDetailAccordionSection>
    );
  }
);

StepLogsSection.displayName = 'StepLogsSection';
