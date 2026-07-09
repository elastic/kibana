/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  EuiDescriptionList,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ResponseActionResult as ResponseActionResultData } from '@kbn/agent-builder-common/tools/tool_result';

// Mirrors `HostStatus.HEALTHY` from
// `x-pack/solutions/security/plugins/security_solution/common/endpoint/types/index.ts`
// — the only status value that should render as "online"/success.
const HEALTHY_STATUS = 'healthy';

const panelStyles = css`
  word-break: break-word;
`;

const ACTION_TITLES: Record<string, string> = {
  isolate: i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.isolateTitle', {
    defaultMessage: 'Host isolation',
  }),
  unisolate: i18n.translate(
    'xpack.agentBuilder.roundEvents.results.responseAction.unisolateTitle',
    { defaultMessage: 'Host release' }
  ),
  scan: i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.scanTitle', {
    defaultMessage: 'Malware scan',
  }),
  'running-processes': i18n.translate(
    'xpack.agentBuilder.roundEvents.results.responseAction.runningProcessesTitle',
    { defaultMessage: 'Running processes' }
  ),
  'list-endpoints': i18n.translate(
    'xpack.agentBuilder.roundEvents.results.responseAction.listEndpointsTitle',
    { defaultMessage: 'Endpoints' }
  ),
  'get-endpoint-status': i18n.translate(
    'xpack.agentBuilder.roundEvents.results.responseAction.endpointStatusTitle',
    { defaultMessage: 'Endpoint status' }
  ),
};

const notFoundTitle = i18n.translate(
  'xpack.agentBuilder.roundEvents.results.responseAction.notFoundTitle',
  { defaultMessage: 'Response action' }
);

interface ResponseActionResultProps {
  result: ResponseActionResultData;
}

export const ResponseActionResult: React.FC<ResponseActionResultProps> = ({ result: { data } }) => {
  const action = data.action as string | undefined;
  const found = data.found as boolean | undefined;

  if (found === false) {
    return <NotFoundPanel data={data} />;
  }

  if (action === 'list-endpoints') {
    return <ListEndpointsPanel data={data} />;
  }

  if (action === 'get-endpoint-status') {
    return <EndpointStatusPanel data={data} />;
  }

  // isolate / unisolate / scan / running-processes: an action was dispatched
  return <DispatchedActionPanel data={data} />;
};

const NotFoundPanel: React.FC<{ data: ResponseActionResultData['data'] }> = ({ data }) => (
  <EuiSplitPanel.Outer hasBorder hasShadow={false} css={panelStyles}>
    <EuiSplitPanel.Inner color="warning" grow={false} paddingSize="m">
      <EuiText size="s" color="warning">
        <strong>{notFoundTitle}</strong>
      </EuiText>
    </EuiSplitPanel.Inner>
    <EuiSplitPanel.Inner paddingSize="m">
      <EuiText size="s">{(data.message as string) ?? 'Endpoint not found.'}</EuiText>
    </EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);

const StatusBadge: React.FC<{ wasSuccessful?: boolean; status?: string }> = ({
  wasSuccessful,
  status,
}) => {
  // Check `status` first — `wasSuccessful` is `false` for both pending and
  // genuinely-failed actions, so relying on it alone shows a red "Failed"
  // badge for actions that are simply not-yet-completed.
  if (status === 'successful' || (wasSuccessful === true && status !== 'failed')) {
    return (
      <EuiBadge color="success">
        {i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.successful', {
          defaultMessage: 'Successful',
        })}
      </EuiBadge>
    );
  }
  if (status === 'failed' || (wasSuccessful === false && status && status !== 'pending')) {
    return (
      <EuiBadge color="danger">
        {i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.failed', {
          defaultMessage: 'Failed',
        })}
      </EuiBadge>
    );
  }
  if (status === 'canceled') {
    return (
      <EuiBadge color="default">
        {i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.canceled', {
          defaultMessage: 'Canceled',
        })}
      </EuiBadge>
    );
  }
  return <EuiBadge color="hollow">{status ?? 'pending'}</EuiBadge>;
};

const getHostNameFromHosts = (hosts: unknown): string | undefined => {
  if (!hosts || typeof hosts !== 'object') return undefined;
  const first = Object.values(hosts as Record<string, { name?: string }>)[0];
  return first?.name;
};

/**
 * `outputs` on the action result is `Record<agentId, ActionResponseOutput>`
 * (see `ActionDetails.outputs` in
 * `x-pack/solutions/security/plugins/security_solution/common/endpoint/types/actions.ts`),
 * not an array — take the first agent's output content since these tools
 * always dispatch to a single resolved endpoint.
 */
const getFirstOutputContent = (outputs: unknown): Record<string, unknown> | undefined => {
  if (!outputs || typeof outputs !== 'object') return undefined;
  const first = Object.values(outputs as Record<string, { content?: Record<string, unknown> }>)[0];
  return first?.content;
};

const ProcessesOutput: React.FC<{ content: Record<string, unknown> }> = ({ content }) => {
  const entries =
    (content.entries as Array<{
      command: string;
      pid: string;
      user: string;
    }>) ?? [];

  if (entries.length === 0) return null;

  return (
    <>
      <EuiText size="xs" color="subdued" css={css({ marginTop: 8 })}>
        {i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.outputs', {
          defaultMessage: '{count, plural, one {# process} other {# processes}}',
          values: { count: entries.length },
        })}
      </EuiText>
      <EuiText size="s">
        <pre>
          {entries.map((entry) => `${entry.pid}\t${entry.user}\t${entry.command}`).join('\n')}
        </pre>
      </EuiText>
    </>
  );
};

const DispatchedActionPanel: React.FC<{ data: ResponseActionResultData['data'] }> = ({ data }) => {
  const action = (data.action as string) ?? '';
  const title = ACTION_TITLES[action] ?? action;
  const hostName = (data.hostName as string) ?? getHostNameFromHosts(data.hosts) ?? 'unknown host';
  const wasSuccessful = data.wasSuccessful as boolean | undefined;
  const status = data.status as string | undefined;
  const actionId = data.actionId as string | undefined;
  const path = data.path as string | undefined;
  const outputContent = getFirstOutputContent(data.outputs);

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} css={panelStyles}>
      <EuiSplitPanel.Inner color="plain" grow={false} paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StatusBadge wasSuccessful={wasSuccessful} status={status} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="m">
        <EuiDescriptionList
          compressed
          type="column"
          listItems={[
            {
              title: i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.host', {
                defaultMessage: 'Host',
              }),
              description: hostName,
            },
            ...(path
              ? [
                  {
                    title: i18n.translate(
                      'xpack.agentBuilder.roundEvents.results.responseAction.path',
                      { defaultMessage: 'Path' }
                    ),
                    description: path,
                  },
                ]
              : []),
            ...(actionId
              ? [
                  {
                    title: i18n.translate(
                      'xpack.agentBuilder.roundEvents.results.responseAction.actionId',
                      { defaultMessage: 'Action ID' }
                    ),
                    description: actionId,
                  },
                ]
              : []),
          ]}
        />
        {action === 'running-processes' && outputContent && (
          <ProcessesOutput content={outputContent} />
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

const EndpointStatusPanel: React.FC<{ data: ResponseActionResultData['data'] }> = ({ data }) => {
  const hostName = data.hostName as string;
  const status = data.status as string;
  const isolated = data.isolated as boolean;
  const lastSeen = data.lastSeen as string | null;

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} css={panelStyles}>
      <EuiSplitPanel.Inner color="plain" grow={false} paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{ACTION_TITLES['get-endpoint-status']}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={status === HEALTHY_STATUS ? 'success' : 'hollow'}>{status}</EuiBadge>
          </EuiFlexItem>
          {isolated && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger">
                {i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.isolated', {
                  defaultMessage: 'Isolated',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="m">
        <EuiDescriptionList
          compressed
          type="column"
          listItems={[
            {
              title: i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.host', {
                defaultMessage: 'Host',
              }),
              description: hostName,
            },
            {
              title: i18n.translate(
                'xpack.agentBuilder.roundEvents.results.responseAction.lastSeen',
                { defaultMessage: 'Last seen' }
              ),
              description: lastSeen ?? '—',
            },
          ]}
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

const ListEndpointsPanel: React.FC<{ data: ResponseActionResultData['data'] }> = ({ data }) => {
  const endpoints =
    (data.endpoints as Array<{
      hostName: string;
      status: string;
      isolated: boolean;
      os: string;
      lastSeen: string | null;
    }>) ?? [];
  const total = (data.total as number) ?? endpoints.length;

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} css={panelStyles}>
      <EuiSplitPanel.Inner color="plain" grow={false} paddingSize="m">
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.agentBuilder.roundEvents.results.responseAction.endpointCount', {
              defaultMessage: '{total, plural, one {# endpoint} other {# endpoints}}',
              values: { total },
            })}
          </strong>
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="m">
        <EuiFlexGroup direction="column" gutterSize="s">
          {endpoints.map((endpoint, idx) => (
            <EuiFlexItem key={`${endpoint.hostName}-${idx}`}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{endpoint.hostName}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={endpoint.status === HEALTHY_STATUS ? 'success' : 'hollow'}>
                    {endpoint.status}
                  </EuiBadge>
                </EuiFlexItem>
                {endpoint.isolated && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger">
                      {i18n.translate(
                        'xpack.agentBuilder.roundEvents.results.responseAction.isolated',
                        { defaultMessage: 'Isolated' }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {endpoint.os}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
