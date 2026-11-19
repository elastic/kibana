/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useFailedAutomationRuns } from '../../hooks/use_failed_automation_runs';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { getWorkflowExecutionPath } from '../../utils/get_workflow_execution_path';

interface FailedAutomationRunsCalloutProps {
  /** Workflow ids of the automations shown on the page. */
  workflowIds: string[];
}

/** Warns when the latest run of an automation failed, and links to that run. */
export const FailedAutomationRunsCallout = ({ workflowIds }: FailedAutomationRunsCalloutProps) => {
  const {
    services: { application },
  } = useKibana();
  const { summaries } = useWorkflowSummaries(workflowIds);
  // Same rule as the automation rows: only workflows we can read (and that still exist) have runs to check.
  const readableWorkflowIds = useMemo(
    () => workflowIds.filter((id) => summaries.get(id)?.definition != null),
    [summaries, workflowIds]
  );
  const failedRuns = useFailedAutomationRuns(readableWorkflowIds);

  const [firstFailedRun] = failedRuns;
  if (!firstFailedRun) {
    return null;
  }

  const { workflowId, execution } = firstFailedRun;
  const name = summaries.get(workflowId)?.name ?? workflowId;
  const errorMessage = execution.error?.message;
  const runHref = application.getUrlForApp(WORKFLOWS_APP_ID, {
    path: getWorkflowExecutionPath(workflowId, execution.id),
  });

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        size="s"
        data-test-subj="contextOverviewFailedRunsCallout"
        title={i18n.translate('xpack.contextEngine.aiIndexDetail.overview.failedRuns.title', {
          defaultMessage:
            '{count, plural, one {# automation run failed.} other {# automation runs failed.}}',
          values: { count: failedRuns.length },
        })}
        text={
          <p data-test-subj="contextOverviewFailedRunsMessage">
            {errorMessage
              ? i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.overview.failedRuns.messageWithError',
                  {
                    defaultMessage: '{name}: {error}',
                    values: { name, error: errorMessage },
                  }
                )
              : name}{' '}
            <EuiLink
              href={runHref}
              data-test-subj="contextOverviewFailedRunsViewRunLink"
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOverview,
                action: CONTEXT_ENGINE_UI_EBT.action.overview.OPEN_FAILED_RUN,
              })}
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.overview.failedRuns.viewRunLink', {
                defaultMessage: 'View run',
              })}
            </EuiLink>
          </p>
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
