/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCodeBlock,
  EuiCommentList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiCommentProps,
  type IconType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InboxAction } from '@kbn/inbox-common';
import { DEFAULT_INBOX_ACTIONS_PER_PAGE, INBOX_CHANNELS } from '@kbn/inbox-common';
import { useInboxActionsHistory } from '../../../hooks/use_inbox_api';
import * as i18n from '../translations';

/**
 * History rows pass through two server states during the "responded but
 * not yet resumed" window: the audit fields land synchronously via
 * {@link https://github.com/elastic/security-team/issues/16706 markStepAsResponded},
 * and the response payload (`response_input`) is then filled in after
 * Task Manager runs the resume. We surface the in-flight state with a
 * "Processing…" badge instead of an invented client-side optimistic flag,
 * so every client (Slack, agent builder, Kibana) renders consistent
 * intermediate state.
 */
const isProcessing = (action: InboxAction): boolean =>
  action.response_mode === 'responded' && action.response_input == null;

const formatTimestamp = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

/**
 * Per-channel display config. The keys are the well-known core
 * surfaces from `INBOX_CHANNELS` plus opt-in entries for first-party
 * client integrations we want to render with a friendly label/icon
 * (e.g. the public `example-mcp-app-security` reference). Anything
 * not in this map falls through to a neutral pill in
 * `renderChannelBadge`, so the audit feed stays readable for
 * arbitrary client-supplied slugs (third-party MCP apps, custom
 * automations) without a Kibana code change.
 */
const CHANNEL_DISPLAY: Record<string, { label: string; icon: IconType }> = {
  [INBOX_CHANNELS.inbox]: { label: i18n.HISTORY_CHANNEL_INBOX, icon: 'email' },
  [INBOX_CHANNELS.kibanaExecutionView]: {
    label: i18n.HISTORY_CHANNEL_KIBANA_EXECUTION_VIEW,
    icon: 'logoKibana',
  },
  [INBOX_CHANNELS.agentBuilder]: {
    label: i18n.HISTORY_CHANNEL_AGENT_BUILDER,
    icon: 'sparkles',
  },
  [INBOX_CHANNELS.slack]: { label: i18n.HISTORY_CHANNEL_SLACK, icon: 'logoSlack' },
  // First-party reference MCP app
  // (https://github.com/elastic/example-mcp-app-security). Kept as a
  // discrete entry so its history rows render with a recognizable
  // tag instead of a generic fallback pill.
  'example-mcp-app-security': {
    label: i18n.HISTORY_CHANNEL_EXAMPLE_MCP_APP_SECURITY,
    icon: 'logoSecurity',
  },
};

/**
 * The default channel (`inbox`) is the overwhelmingly common case for
 * Kibana-UI responses, so we suppress its badge to keep the audit feed
 * uncluttered. Non-default channels (Slack, MCP/API, agent builder)
 * show an explicit tag so the audit trail makes the source obvious.
 *
 * Returns `null` when no badge should render — also covers the
 * pre-channel-feature history rows that ship with `channel: null`.
 */
const renderChannelBadge = (channel: InboxAction['channel']) => {
  if (!channel || channel === INBOX_CHANNELS.inbox) {
    return null;
  }
  const display = CHANNEL_DISPLAY[channel] ?? { label: channel, icon: 'globe' as IconType };
  return (
    <EuiToolTip position="top" content={i18n.getHistoryChannelTooltip(display.label)}>
      {/*
        EuiBadge is non-interactive on its own, so we make it keyboard
        focusable to satisfy the @elastic/eui/tooltip-focusable-anchor
        rule. The tooltip text is the user-facing affordance — there's
        no equivalent click target to switch to.
      */}
      <EuiBadge
        color="hollow"
        iconType={display.icon}
        tabIndex={0}
        data-test-subj="inboxHistoryChannelBadge"
      >
        {display.label}
      </EuiBadge>
    </EuiToolTip>
  );
};

const buildBody = (action: InboxAction) => {
  const responsePayload = action.response_input ?? null;
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {action.input_message ? (
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <strong>{i18n.HISTORY_PROMPT_LABEL}</strong>
          </EuiText>
          <EuiText size="s">
            <p>{action.input_message}</p>
          </EuiText>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          <strong>{i18n.HISTORY_RESPONSE_LABEL}</strong>
        </EuiText>
        {responsePayload && Object.keys(responsePayload).length > 0 ? (
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {JSON.stringify(responsePayload, null, 2)}
          </EuiCodeBlock>
        ) : (
          <EuiText size="s" color="subdued">
            <p>{i18n.HISTORY_NO_RESPONSE_PAYLOAD}</p>
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const buildComment = (action: InboxAction): EuiCommentProps => {
  const responder = action.responded_by ?? i18n.HISTORY_SYSTEM_RESPONDER;
  const timestampLabel = formatTimestamp(action.responded_at ?? action.created_at);
  const isTimedOut = action.response_mode === 'timed_out';
  const isRejected = action.status === 'rejected';
  const processing = isProcessing(action);
  const channelBadge = renderChannelBadge(action.channel);

  return {
    // EuiCommentList renders the `username` in the avatar/header, so
    // we don't repeat it in `event` text — that's what produced the
    // "elastic elastic responded" double-up surfaced during browser
    // validation.
    username: responder,
    timelineAvatarAriaLabel: responder,
    event: (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.inbox.actionsPage.historySection.eventText"
            defaultMessage="responded to {title}"
            values={{
              title: <em>{action.title}</em>,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{action.source_app}</EuiBadge>
        </EuiFlexItem>
        {/*
          Status badge: green for the v1 "approved" placeholder, red
          when `to_inbox_action.deriveHistoryStatus` mapped a rejection
          payload. Bumps the audit feed from "everything looks the
          same" to a quick visual scan of approve-vs-reject outcomes.
        */}
        <EuiFlexItem grow={false}>
          {isRejected ? (
            <EuiBadge color="danger" iconType="cross" data-test-subj="inboxHistoryRejectedBadge">
              {i18n.STATUS_REJECTED}
            </EuiBadge>
          ) : (
            <EuiBadge color="success" iconType="check">
              {i18n.STATUS_APPROVED}
            </EuiBadge>
          )}
        </EuiFlexItem>
        {channelBadge ? <EuiFlexItem grow={false}>{channelBadge}</EuiFlexItem> : null}
        {isTimedOut ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">{i18n.HISTORY_TIMED_OUT_BADGE}</EuiBadge>
          </EuiFlexItem>
        ) : null}
        {processing ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="accent" iconType="clock" data-test-subj="inboxHistoryProcessingBadge">
              {i18n.HISTORY_PROCESSING_BADGE}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ),
    timestamp: timestampLabel,
    children: buildBody(action),
  };
};

export const InboxHistoryFeed: React.FC = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_INBOX_ACTIONS_PER_PAGE);
  const { data, isLoading, error, refetch } = useInboxActionsHistory({
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const items = data?.actions ?? [];
  const totalItemCount = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalItemCount / pageSize));

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="inboxHistorySection">
      <EuiTitle size="m">
        <h2>{i18n.HISTORY_SECTION_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText color="subdued" size="s">
        <p>{i18n.HISTORY_SECTION_DESCRIPTION}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {error ? (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={<h3>{i18n.HISTORY_LOAD_ERROR_TITLE}</h3>}
          body={<p>{i18n.getHistoryLoadErrorBody(String(error))}</p>}
          actions={[
            <EuiButton key="retry" onClick={() => refetch()} iconType="refresh">
              {i18n.RETRY_BUTTON}
            </EuiButton>,
          ]}
        />
      ) : isLoading && items.length === 0 ? (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : items.length === 0 ? (
        <EuiEmptyPrompt
          iconType="clock"
          title={<h3>{i18n.HISTORY_EMPTY_TITLE}</h3>}
          body={<p>{i18n.HISTORY_EMPTY_BODY}</p>}
        />
      ) : (
        <>
          <EuiCommentList
            aria-label={i18n.HISTORY_SECTION_TITLE}
            comments={items.map(buildComment)}
          />
          <EuiSpacer size="m" />
          <EuiTablePagination
            pageCount={pageCount}
            activePage={pageIndex}
            onChangePage={setPageIndex}
            itemsPerPage={pageSize}
            itemsPerPageOptions={[10, 25, 50]}
            onChangeItemsPerPage={(size) => {
              setPageSize(size);
              setPageIndex(0);
            }}
          />
        </>
      )}
    </EuiPanel>
  );
};
