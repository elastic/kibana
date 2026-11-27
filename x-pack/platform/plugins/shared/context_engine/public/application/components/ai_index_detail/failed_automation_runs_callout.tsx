/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useFailedAutomationRuns } from '../../hooks/use_failed_automation_runs';
import { useKibana } from '../../hooks/use_kibana';
import { hasReadableWorkflow, useWorkflowSummaries } from '../../hooks/use_workflow_summaries';
import { getWorkflowExecutionPath } from '../../utils/get_workflow_execution_path';
import { goToAutomations } from './automations_panel_id';

// The small callout shows its text inline, so CSS cannot clamp it. 200 chars is about 2 lines.
const MAX_MESSAGE_LENGTH = 200;
const messageStyle = css({ overflowWrap: 'anywhere' });

const shortenMessage = (message: string): string =>
  message.length > MAX_MESSAGE_LENGTH ? `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : message;

interface FailedAutomationRunsCalloutProps {
  workflowIds: string[];
}

export const FailedAutomationRunsCallout = ({ workflowIds }: FailedAutomationRunsCalloutProps) => {
  const {
    services: { application },
  } = useKibana();
  const { summaries } = useWorkflowSummaries(workflowIds);
  const readableWorkflowIds = useMemo(
    () => workflowIds.filter((id) => hasReadableWorkflow(summaries.get(id))),
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
  const message = errorMessage
    ? i18n.translate('xpack.contextEngine.aiIndexDetail.overview.failedRuns.messageWithError', {
        defaultMessage: '{name}: {error}',
        values: { name, error: errorMessage },
      })
    : name;

  const text =
    failedRuns.length > 1 ? (
      <p>
        <EuiLink
          onClick={goToAutomations}
          data-test-subj="contextOverviewFailedRunsViewAutomationsLink"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOverview,
            action: CONTEXT_ENGINE_UI_EBT.action.overview.VIEW_FAILED_AUTOMATIONS,
          })}
        >
          {i18n.translate(
            'xpack.contextEngine.aiIndexDetail.overview.failedRuns.viewAutomationsLink',
            { defaultMessage: 'View automations' }
          )}
        </EuiLink>
      </p>
    ) : (
      <p data-test-subj="contextOverviewFailedRunsMessage" title={message} css={messageStyle}>
        {shortenMessage(message)}{' '}
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
    );

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
        text={text}
      />
      <EuiSpacer size="l" />
    </>
  );
};
