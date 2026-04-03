/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiOverflowScroll,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { isToolCallStep, type ConversationRound } from '@kbn/agent-builder-common';
import { useConversationRounds } from '../../hooks/use_conversation';

const WORKFLOWS_NS = 'platform.workflows';
const STEP_TOOL_PREFIX = `${WORKFLOWS_NS}.step.`;
const CONNECTOR_STEP_ID = `${STEP_TOOL_PREFIX}connector-step`;
const GET_CONNECTORS_TOOL_ID = `${WORKFLOWS_NS}.get_connectors`;
const CONNECTOR_DISCOVERY_TOOL_ID = `${STEP_TOOL_PREFIX}discover-connectors`;
const CONNECT_CONNECTOR_TOOL_ID = `${WORKFLOWS_NS}.connect_connector`;

const ICON_MAP: Record<string, string> = {
  slack: 'logoSlack',
  slack_api: 'logoSlack',
  http: 'globe',
  webhook: 'globe',
  email: 'email',
  jira: 'logoJira',
  github: 'logoGithub',
  teams: 'apps',
  pagerduty: 'bell',
  opsgenie: 'bell',
  servicenow: 'logoObservability',
  bedrock: 'logoAWS',
  openai: 'sparkles',
  gemini: 'logoGCP',
  swimlane: 'logoObservability',
  resilient: 'logoObservability',
  torq: 'bolt',
  tines: 'bolt',
  'gen-ai': 'sparkles',
  inference: 'sparkles',
  'cases-webhook': 'casesApp',
  'd3security': 'logoSecurity',
  thehive: 'logoSecurity',
  'server-log': 'logsApp',
  index: 'indexOpen',
  elasticsearch: 'logoElasticsearch',
  kibana: 'logoKibana',
  data: 'database',
  if: 'branch',
  foreach: 'repeat',
  while: 'refresh',
  switch: 'logstashFilter',
  wait: 'clock',
  console: 'console',
  ai: 'sparkles',
};

interface ToolEntry {
  id: string;
  displayName: string;
  icon: string;
  callCount: number;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stepIdToDisplayName(stepSuffix: string): string {
  return stepSuffix
    .replace(/-/g, ' ')
    .split('.')
    .map((seg) =>
      seg
        .split(/[\s_]+/)
        .map(capitalize)
        .join(' ')
    )
    .join(' › ');
}

function iconForStep(stepSuffix: string): string {
  const normalized = stepSuffix.replace(/-/g, '_');
  const first = normalized.split('.')[0];
  return ICON_MAP[normalized] ?? ICON_MAP[first] ?? 'gear';
}

/**
 * Build a connectorId → connector type name map from get_connectors results
 * and connect_connector results across all rounds.
 */
function buildConnectorIdMap(rounds: ConversationRound[]): Map<string, string> {
  const idToType = new Map<string, string>();

  for (const round of rounds) {
    for (const step of round.steps) {
      if (!isToolCallStep(step)) continue;

      // get_connectors results contain { connectors: [{ id, actionTypeId, ... }] }
      if (step.tool_id === GET_CONNECTORS_TOOL_ID || step.tool_id === CONNECTOR_DISCOVERY_TOOL_ID) {
        for (const result of step.results ?? []) {
          const data = (result as { data?: Record<string, unknown> }).data;
          const connectors = data?.connectors as Array<{
            id?: string;
            actionTypeId?: string;
            name?: string;
          }> | undefined;
          if (!connectors) continue;
          for (const c of connectors) {
            if (c.id && c.actionTypeId) {
              idToType.set(c.id, c.actionTypeId.replace(/^\./, ''));
            }
          }
        }
      }

      // connect_connector results contain { connectorId, name }
      if (step.tool_id === CONNECT_CONNECTOR_TOOL_ID) {
        const params = step.params as Record<string, unknown>;
        for (const result of step.results ?? []) {
          const data = (result as { data?: Record<string, unknown> }).data;
          const connectorId = data?.connectorId as string | undefined;
          const typeId = params?.connectorTypeId as string | undefined;
          if (connectorId && typeId) {
            idToType.set(connectorId, typeId.replace(/^\./, ''));
          }
        }
      }
    }
  }

  return idToType;
}

/**
 * Resolve the connector type for a connector-step call.
 * Tries: action prefix ("github.getMe" → "github"), then connectorId lookup.
 */
function resolveConnectorType(
  params: Record<string, unknown>,
  connectorIdMap: Map<string, string>
): string | undefined {
  const action = params?.action as string | undefined;
  if (action?.includes('.')) {
    return action.split('.')[0];
  }

  const connectorId = params?.connectorId as string | undefined;
  if (connectorId) {
    return connectorIdMap.get(connectorId);
  }

  return undefined;
}

function buildUsedStepTools(rounds: ConversationRound[]): ToolEntry[] {
  const connectorIdMap = buildConnectorIdMap(rounds);
  const entriesMap = new Map<string, ToolEntry>();

  for (const round of rounds) {
    for (const step of round.steps) {
      if (!isToolCallStep(step)) continue;
      if (!step.tool_id.startsWith(STEP_TOOL_PREFIX)) continue;

      if (step.tool_id === CONNECTOR_STEP_ID) {
        const params = step.params as Record<string, unknown>;
        const connType = resolveConnectorType(params, connectorIdMap);
        const key = connType ? `connector:${connType}` : CONNECTOR_STEP_ID;

        if (!entriesMap.has(key)) {
          entriesMap.set(key, {
            id: key,
            displayName: connType ? capitalize(connType) : 'Connector Step',
            icon: connType ? (ICON_MAP[connType] ?? 'gear') : 'gear',
            callCount: 0,
          });
        }
        entriesMap.get(key)!.callCount++;
      } else {
        const stepSuffix = step.tool_id.slice(STEP_TOOL_PREFIX.length);

        if (!entriesMap.has(step.tool_id)) {
          entriesMap.set(step.tool_id, {
            id: step.tool_id,
            displayName: stepIdToDisplayName(stepSuffix),
            icon: iconForStep(stepSuffix),
            callCount: 0,
          });
        }
        entriesMap.get(step.tool_id)!.callCount++;
      }
    }
  }

  return Array.from(entriesMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
}

const ToolRow: React.FC<{ entry: ToolEntry }> = ({ entry }) => (
  <EuiToolTip content={`Called ${entry.callCount} time${entry.callCount !== 1 ? 's' : ''}`} position="left" delay="long">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={entry.icon} size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="xs">
          <strong>{entry.displayName}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="primary">{entry.callCount}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);

export const ToolsSidebar: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const conversationRounds = useConversationRounds();

  const used = useMemo(
    () => buildUsedStepTools(conversationRounds),
    [conversationRounds]
  );

  const sidebarStyles = css`
    height: 100%;
    border-left: ${euiTheme.border.thin};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  const scrollStyles = css`
    ${useEuiScrollBar()}
    ${useEuiOverflowScroll('y')}
    flex: 1;
    min-height: 0;
    padding: ${euiTheme.size.m};
  `;

  const headerStyles = css`
    padding: ${euiTheme.size.m} ${euiTheme.size.m} 0 ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={sidebarStyles}>
      <EuiFlexItem grow={false} css={headerStyles}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.agentBuilder.toolsSidebar.title', {
                  defaultMessage: 'Steps Used',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          {used.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{used.length}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow css={scrollStyles}>
        {used.length === 0 ? (
          <EuiText size="s" color="subdued" textAlign="center">
            <p>
              {i18n.translate('xpack.agentBuilder.toolsSidebar.empty', {
                defaultMessage: 'Steps used in this conversation will appear here.',
              })}
            </p>
          </EuiText>
        ) : (
          used.map((entry) => (
            <React.Fragment key={entry.id}>
              <ToolRow entry={entry} />
              <EuiSpacer size="xs" />
            </React.Fragment>
          ))
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
