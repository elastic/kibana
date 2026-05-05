/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';

const WORKFLOWS_PLUGIN_ID = 'workflows';
/**
 * UUID v4 prefix matching the leading id segment of a `discovery_id`,
 * `verdict_id`, or event/verdict `_id` produced by the multi-step pipeline.
 * Used to recover the workflow execution id where it isn't stored as its own
 * field.
 */
const UUID_PREFIX_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Best-effort extraction of the workflow execution uuid from a composite id
 * such as `<execution-uuid>-<discovery_slug>`. Returns `undefined` if the
 * input doesn't start with a uuid.
 */
export function extractExecutionIdFromCompositeId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const match = UUID_PREFIX_RE.exec(id);
  return match ? match[0] : undefined;
}

/**
 * Render a stream name as an `EuiBadge` linking to the streams app overview
 * page for that stream.
 */
export function StreamLink({ name }: { name: string }) {
  const router = useStreamsAppRouter();
  const href = router.link('/{key}', { path: { key: name } });
  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.links.viewStreamTooltip',
        {
          defaultMessage: 'View stream',
        }
      )}
    >
      <EuiLink href={href} data-test-subj="streamsDiscoveryStreamLink" color="text">
        <EuiBadge color="hollow">{name}</EuiBadge>
      </EuiLink>
    </EuiToolTip>
  );
}

/**
 * Render the `rule_name` as an `EuiLink` pointing to the Stack Management
 * Rule details page when a `rule_uuid` is available; otherwise fall back to
 * plain text.
 */
export function RuleLink({ name, uuid }: { name: string; uuid?: string }) {
  const {
    core: { http },
  } = useKibana();
  if (!uuid) {
    return <EuiText size="s">{name}</EuiText>;
  }
  const href = http.basePath.prepend(
    `/app/management/insightsAndAlerting/triggersActions/rule/${encodeURIComponent(uuid)}`
  );
  return (
    <EuiToolTip
      content={i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.links.ruleTooltip', {
        defaultMessage: 'Open rule details',
      })}
    >
      <EuiLink href={href} target="_blank" data-test-subj="streamsDiscoveryRuleLink">
        {name}
      </EuiLink>
    </EuiToolTip>
  );
}

interface WorkflowExecutionLookup {
  workflowId: string;
}

/**
 * Render a workflow execution id as an `EuiLink` that lazily resolves the
 * workflow id from the `GET /api/workflows/executions/{id}` endpoint and
 * navigates to the Workflows app's execution view on click. Loading and
 * error states are handled inline.
 */
export function WorkflowExecutionLink({
  executionId,
  label,
}: {
  executionId: string;
  label?: string;
}) {
  const {
    core: {
      application,
      http,
      notifications: { toasts },
    },
  } = useKibana();
  const [isResolving, setIsResolving] = useState(false);

  const display = label ?? `${executionId.slice(0, 8)}…`;

  const handleClick = async () => {
    if (isResolving) return;
    setIsResolving(true);
    try {
      const response = await http.get<WorkflowExecutionLookup>(
        `/api/workflows/executions/${encodeURIComponent(executionId)}`
      );
      const workflowId = response?.workflowId;
      if (!workflowId) {
        toasts.addWarning({
          title: i18n.translate(
            'xpack.streams.sigEventsDiscovery.multiStep.links.workflowExecutionNoWorkflowId',
            { defaultMessage: 'Workflow id is missing for this execution' }
          ),
        });
        return;
      }
      application.navigateToApp(WORKFLOWS_PLUGIN_ID, {
        path: `/${workflowId}?tab=executions&executionId=${encodeURIComponent(executionId)}`,
      });
    } catch (error) {
      toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.links.workflowExecutionLookupErrorTitle',
          { defaultMessage: 'Failed to open workflow execution' }
        ),
      });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.links.workflowExecutionTooltip',
        { defaultMessage: 'Open workflow execution {executionId}', values: { executionId } }
      )}
    >
      <EuiLink
        onClick={handleClick}
        disabled={isResolving}
        data-test-subj="streamsDiscoveryWorkflowExecutionLink"
      >
        {isResolving ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <EuiText size="xs" component="span">
            <code>{display}</code>
          </EuiText>
        )}
      </EuiLink>
    </EuiToolTip>
  );
}

/**
 * Open-in-Discover button for an ES|QL evidence query. Renders nothing if
 * the Discover locator is unavailable in the current Kibana setup.
 */
export function DiscoverEsqlButton({ esql }: { esql: string }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const locator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  if (!locator) return null;
  return (
    <EuiButtonEmpty
      size="xs"
      iconType="discoverApp"
      iconSide="left"
      data-test-subj="streamsDiscoveryEvidenceOpenInDiscover"
      onClick={() => {
        locator.navigate({
          query: { esql },
          // Let Discover pick a sensible time range from the ES|QL query when
          // possible; otherwise fall back to the user's current selection.
        });
      }}
    >
      {i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.links.openInDiscoverLabel', {
        defaultMessage: 'Open in Discover',
      })}
    </EuiButtonEmpty>
  );
}
