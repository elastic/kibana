/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMetadataItem } from '@kbn/app-header';
import { WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID } from '@kbn/workflows/common/constants';
import { useKibana } from '../../../common/lib/kibana';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';

const WORKFLOWS_APP_ID = 'workflows';

const WORKFLOW_RUN_LABEL = i18n.translate('xpack.osquery.queryDetailsHeader.workflowRunLabel', {
  defaultMessage: 'Workflow run',
});

const UNVERIFIED_WORKFLOW_RUN_LABEL = i18n.translate(
  'xpack.osquery.queryDetailsHeader.unverifiedWorkflowRunLabel',
  { defaultMessage: 'Workflow run (unverified)' }
);

const OPEN_WORKFLOW_RUN_LABEL = i18n.translate(
  'xpack.osquery.queryDetailsHeader.openWorkflowRunLabel',
  { defaultMessage: 'Started by a workflow run' }
);

const OPEN_UNVERIFIED_WORKFLOW_RUN_LABEL = i18n.translate(
  'xpack.osquery.queryDetailsHeader.openUnverifiedWorkflowRunLabel',
  { defaultMessage: 'Started by a workflow run (unverified)' }
);

/**
 * Header metadata item for a live query a workflow run started. It links to the run in the
 * Workflows Executions view, which opens a run from its ID alone (osquery stores no workflow ID).
 * Without access to the Workflows app, or with that view turned off, the run ID is shown as text.
 * Until Kibana can verify runs (security-team#20085), anyone sending the internal-origin header
 * can name any run, so an unverified origin says so instead of reading as fact.
 */
export const useWorkflowOriginMetadata = (
  origin: LiveQueryDetailsItem['origin']
): AppHeaderMetadataItem | undefined => {
  const { application, settings } = useKibana().services;
  const runId = origin?.type === 'workflow' ? origin.run_id : undefined;
  const isVerified = origin?.verified === true;
  const canOpenWorkflows = !!application.capabilities.navLinks?.[WORKFLOWS_APP_ID];
  const isExecutionsViewEnabled =
    settings?.globalClient?.get<boolean>(
      WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID,
      true
    ) ?? false;

  return useMemo(() => {
    if (!runId) {
      return undefined;
    }

    if (canOpenWorkflows && isExecutionsViewEnabled) {
      return {
        type: 'button',
        label: isVerified ? OPEN_WORKFLOW_RUN_LABEL : OPEN_UNVERIFIED_WORKFLOW_RUN_LABEL,
        href: application.getUrlForApp(WORKFLOWS_APP_ID, {
          path: `/executions?executionId=${encodeURIComponent(runId)}`,
        }),
        'data-test-subj': 'liveQueryDetailsWorkflowRunLink',
      };
    }

    return {
      type: 'text',
      label: isVerified ? WORKFLOW_RUN_LABEL : UNVERIFIED_WORKFLOW_RUN_LABEL,
      value: runId,
      'data-test-subj': 'liveQueryDetailsWorkflowRun',
    };
  }, [application, canOpenWorkflows, isExecutionsViewEnabled, isVerified, runId]);
};
