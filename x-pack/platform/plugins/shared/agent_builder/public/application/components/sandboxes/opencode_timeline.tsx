/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useListConnectors } from '../../hooks/tools/use_mcp_connectors';
import { ConnectorTypeIcon } from '../connectors/connector_type_icon';

export interface OpencodeTodo {
  content: string;
  status: string;
}

export interface OpencodeTimelineItem {
  id: string;
  phase: string;
  label: string;
  status?: 'in_progress' | 'completed' | 'failed';
  detail?: string;
  command?: string;
  output?: string;
  todos?: OpencodeTodo[];
  filePath?: string;
  fileContent?: string;
  fileLanguage?: string;
  /** Optional EUI icon override for this specific activity item. */
  iconType?: string;
  /** Optional product badge treatment for credential/infrastructure rows. */
  credentialIconVariant?: 'secured' | 'compute';
  /** Connector instance id for `kibana` connector calls (renders its icon). */
  connectorId?: string;
}

/** Phase → EUI icon type. */
const PHASE_ICON: Record<string, string> = {
  provisioning: 'container',
  connecting: 'plugs',
  credential: 'lockOpen',
  thinking: 'sparkles',
  editing: 'documentEdit',
  running: 'play',
  searching: 'search',
  kibana: 'logoElasticsearch',
  todo: 'list',
  tool: 'wrench',
  done: 'checkInCircleFilled',
};

const topMargin = css`
  margin-top: 2px;
`;

const StatusIcon: React.FC<{
  status?: OpencodeTimelineItem['status'];
  phase: string;
  iconType?: string;
  credentialIconVariant?: OpencodeTimelineItem['credentialIconVariant'];
  /** Resolved action type for a connector call, so we can show its own icon. */
  actionTypeId?: string;
}> = ({ status, phase, iconType, credentialIconVariant, actionTypeId }) => {
  const { euiTheme } = useEuiTheme();
  if (status === 'failed') {
    return (
      <EuiIcon type="errorFilled" size="s" color="danger" css={topMargin} aria-hidden={true} />
    );
  }
  if (status === 'in_progress' && phase !== 'done') {
    return <EuiLoadingSpinner size="s" css={topMargin} />;
  }
  // A connector call shows that connector's own icon (e.g. AbuseIPDB, Slack),
  // resolved from its action type; falls back to the generic phase icon.
  if (phase === 'kibana' && actionTypeId) {
    return (
      <span css={topMargin}>
        <ConnectorTypeIcon actionTypeId={actionTypeId} size="s" />
      </span>
    );
  }
  if (phase === 'credential' && iconType && credentialIconVariant) {
    const badgeIcon = credentialIconVariant === 'secured' ? 'lock' : 'compute';
    return (
      <span
        css={css`
          ${topMargin};
          position: relative;
          display: inline-flex;
          width: ${euiTheme.size.base};
          height: ${euiTheme.size.base};
          align-items: center;
          justify-content: center;
        `}
      >
        <EuiIcon type={iconType} size="s" color={euiTheme.colors.textSuccess} aria-hidden={true} />
        <EuiIcon
          type={badgeIcon}
          size="m"
          color={euiTheme.colors.textSuccess}
          aria-hidden={true}
          css={css`
            position: absolute;
            right: -${euiTheme.size.xs};
            bottom: -${euiTheme.size.xs};
            padding: 0;
            border-radius: 50%;
            background: ${euiTheme.colors.backgroundBasePlain};
            transform: scale(0.78);
          `}
        />
      </span>
    );
  }
  const icon = iconType ?? PHASE_ICON[phase] ?? 'wrench';
  // Highlight security-relevant steps: connector calls (accent) and credential
  // minting (success/green, to read as "a scoped, short-lived grant happened").
  const color =
    phase === 'kibana'
      ? euiTheme.colors.textAccent
      : phase === 'credential'
      ? euiTheme.colors.textSuccess
      : 'subdued';
  return <EuiIcon type={icon} size="s" color={color} css={topMargin} aria-hidden={true} />;
};

const TODO_ICON: Record<string, string> = {
  completed: 'checkInCircleFilled',
  in_progress: 'dot',
  pending: 'empty',
};

const TodoList: React.FC<{ todos: OpencodeTodo[] }> = ({ todos }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
      `}
    >
      {todos.map((todo, idx) => (
        <EuiFlexGroup key={`todo-${idx}`} gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={TODO_ICON[todo.status] ?? 'empty'}
              size="s"
              color={todo.status === 'completed' ? 'success' : 'subdued'}
              aria-hidden={true}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText
              size="xs"
              color={todo.status === 'completed' ? 'subdued' : 'default'}
              css={
                todo.status === 'completed'
                  ? css`
                      text-decoration: line-through;
                    `
                  : undefined
              }
            >
              {todo.content}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </div>
  );
};

const TimelineRow: React.FC<{
  item: OpencodeTimelineItem;
  autoExpand: boolean;
  /** connector instance id -> action type id, for per-connector icons. */
  connectorTypeById: Map<string, string>;
}> = ({ item, autoExpand, connectorTypeById }) => {
  const { euiTheme } = useEuiTheme();
  const hasDetail = Boolean(item.command || item.output || item.todos?.length || item.fileContent);
  const [isOpen, setIsOpen] = useState(false);
  const expanded = hasDetail && (isOpen || (autoExpand && item.status === 'in_progress'));

  const codeFont = css`
    font-family: ${euiTheme.font.familyCode};
    word-break: break-word;
  `;

  return (
    <div>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="flexStart"
        responsive={false}
        css={
          hasDetail
            ? css`
                cursor: pointer;
              `
            : undefined
        }
        onClick={hasDetail ? () => setIsOpen((v) => !v) : undefined}
      >
        <EuiFlexItem grow={false}>
          <StatusIcon
            status={item.status}
            phase={item.phase}
            iconType={item.iconType}
            credentialIconVariant={item.credentialIconVariant}
            actionTypeId={item.connectorId ? connectorTypeById.get(item.connectorId) : undefined}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{item.label}</EuiText>
          {item.detail && !expanded && (
            <EuiText size="xs" color="subdued" css={codeFont}>
              {item.detail}
            </EuiText>
          )}
        </EuiFlexItem>
        {hasDetail && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={expanded ? 'arrowUp' : 'arrowDown'}
              size="s"
              color="subdued"
              aria-hidden={true}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {expanded && (
        <div
          css={css`
            margin-left: ${euiTheme.size.l};
            margin-top: ${euiTheme.size.xs};
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.xs};
          `}
        >
          {item.command && (
            <EuiCodeBlock language="bash" fontSize="s" paddingSize="s" isCopyable>
              {item.command}
            </EuiCodeBlock>
          )}
          {item.fileContent && (
            <>
              {item.filePath && (
                <EuiText size="xs" color="subdued" css={codeFont}>
                  {item.filePath}
                </EuiText>
              )}
              <EuiCodeBlock
                language={item.fileLanguage ?? 'text'}
                fontSize="s"
                paddingSize="s"
                overflowHeight={260}
                lineNumbers
                isCopyable
              >
                {item.fileContent}
              </EuiCodeBlock>
            </>
          )}
          {item.output?.trim() &&
            (item.phase === 'thinking' ? (
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  white-space: pre-wrap;
                  font-style: italic;
                `}
              >
                {item.output.trim()}
              </EuiText>
            ) : (
              <EuiCodeBlock
                fontSize="s"
                paddingSize="s"
                overflowHeight={220}
                transparentBackground
                css={css`
                  white-space: pre-wrap;
                `}
              >
                {item.output.trim()}
              </EuiCodeBlock>
            ))}
          {item.todos?.length ? <TodoList todos={item.todos} /> : null}
        </div>
      )}
    </div>
  );
};

/**
 * Renders an OpenCode activity timeline (the vertical rail of rows) shared by the
 * inline conversation step card and the Sandbox executions flyout.
 */
export const OpencodeTimeline: React.FC<{
  timeline: OpencodeTimelineItem[];
  autoExpand?: boolean;
}> = ({ timeline, autoExpand = false }) => {
  const { euiTheme } = useEuiTheme();
  // Shared, cached connector list (same query the Connectors page uses); lets us
  // map a connector instance id to its action type for the per-connector icon.
  const { connectors } = useListConnectors({});
  const connectorTypeById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of connectors) map.set(c.id, c.actionTypeId);
    return map;
  }, [connectors]);
  if (!timeline.length) return null;
  return (
    <div
      css={css`
        border-left: 2px solid ${euiTheme.colors.borderBaseSubdued};
        margin-left: ${euiTheme.size.s};
        padding-left: ${euiTheme.size.m};
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
    >
      {timeline.map((item) => (
        <TimelineRow
          key={item.id}
          item={item}
          autoExpand={autoExpand}
          connectorTypeById={connectorTypeById}
        />
      ))}
    </div>
  );
};
