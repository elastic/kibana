/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActivityEntry, TimelineEventItem } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { ActorAvatar, ActorBadge, RelativeTime, formatAbsoluteUtc } from '../shared';
import type { TabProps } from '../tabs/tab_props';
import { ACTOR_KIND_ICONS, formatClock, formatOffset } from './activity_helpers';
import { LinkChips } from './link_chips';
import * as i18n from './translations';

const DETAILS_CLAMP_LENGTH = 160;

interface RowFrameProps {
  id: string;
  ts: number;
  offsetOrigin: number | undefined;
  lane: 'security' | 'response';
  isHighlighted: boolean;
  marker: React.ReactNode;
  children: React.ReactNode;
}

const RowFrame: React.FC<RowFrameProps> = ({
  id,
  ts,
  offsetOrigin,
  lane,
  isHighlighted,
  marker,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const offset = formatOffset(ts, offsetOrigin);

  return (
    <div
      id={`investigation-timeline-${id}`}
      data-test-subj={`investigationTimelineRow-${lane}`}
      data-highlighted={isHighlighted}
      css={css`
        display: grid;
        grid-template-columns: 112px ${euiTheme.size.xl} minmax(0, 1fr);
        column-gap: ${euiTheme.size.s};
        padding-block: ${euiTheme.size.xs};
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${isHighlighted ? euiTheme.colors.backgroundLightPrimary : 'transparent'};
        transition: background-color ${euiTheme.animation.slow} ease-out;
      `}
    >
      <div
        css={css`
          text-align: end;
          padding-block-start: ${euiTheme.size.s};
        `}
      >
        <EuiToolTip content={formatAbsoluteUtc(new Date(ts).toISOString())}>
          <time
            dateTime={new Date(ts).toISOString()}
            tabIndex={0}
            data-test-subj="investigationTimelineTime"
            css={css`
              display: block;
              font-weight: ${euiTheme.font.weight.bold};
              font-variant-numeric: tabular-nums;
              color: ${euiTheme.colors.textHeading};
            `}
          >
            {formatClock(ts)}
          </time>
        </EuiToolTip>
        {offset ? (
          <EuiText size="xs" color="subdued" data-test-subj="investigationTimelineOffset">
            {offset}
          </EuiText>
        ) : null}
      </div>
      <div
        css={css`
          position: relative;
          display: flex;
          justify-content: center;
          &::before {
            content: '';
            position: absolute;
            inset-block: calc(${euiTheme.size.xs} * -1);
            width: 2px;
            background-color: ${euiTheme.colors.lightShade};
          }
        `}
        aria-hidden="true"
      >
        <span
          css={css`
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: ${euiTheme.size.l};
            height: ${euiTheme.size.l};
            margin-block-start: ${euiTheme.size.xs};
            border-radius: 50%;
            background-color: ${euiTheme.colors.backgroundBasePlain};
            border: 2px solid
              ${lane === 'security' ? euiTheme.colors.danger : euiTheme.colors.primary};
          `}
        >
          {marker}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
};
RowFrame.displayName = 'RowFrame';

export interface SecurityEventRowProps {
  item: TimelineEventItem;
  ts: number;
  offsetOrigin: number | undefined;
  isHighlighted: boolean;
  onNavigateTab: TabProps['onNavigateTab'];
}

export const SecurityEventRow: React.FC<SecurityEventRowProps> = ({
  item,
  ts,
  offsetOrigin,
  isHighlighted,
  onNavigateTab,
}) => {
  const { euiTheme } = useEuiTheme();
  const { timeline_event: event } = item;
  const severity = event.alert_severity;
  const isHighSeverity = severity === 'high' || severity === 'critical';

  return (
    <RowFrame
      id={`event-${item.id}`}
      ts={ts}
      offsetOrigin={offsetOrigin}
      lane="security"
      isHighlighted={isHighlighted}
      marker={<EuiIcon type={ICONS.timelineEvent} size="s" color="danger" aria-hidden={true} />}
    >
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
        <EuiText size="s">
          <strong data-test-subj="investigationTimelineTitle">{item.title}</strong>
        </EuiText>
        {item.text ? (
          <EuiText size="s" color="subdued">
            <p>{item.text}</p>
          </EuiText>
        ) : null}
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          wrap
          responsive={false}
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="investigationTimelineStage">
              {event.mitre ? `${event.stage} · ${event.mitre}` : event.stage}
            </EuiBadge>
          </EuiFlexItem>
          {severity ? (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={isHighSeverity ? 'danger' : 'warning'}
                data-test-subj="investigationTimelineSeverity"
              >
                {i18n.ALERT_SEVERITY(severity)}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {event.flag === 'suspected' ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning" data-test-subj="investigationTimelineSuspected">
                {i18n.SUSPECTED}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={ACTOR_KIND_ICONS[event.actor.kind]} size="s" aria-hidden="true" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" data-test-subj="investigationTimelineActor">
                  <strong>{event.actor.name}</strong>
                </EuiText>
              </EuiFlexItem>
              {event.actor.sub ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {event.actor.sub}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.OBSERVED_BY(event.source)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {event.links.length > 0 ? (
          <div
            css={css`
              margin-block-start: ${euiTheme.size.s};
            `}
          >
            <LinkChips links={event.links} onNavigateTab={onNavigateTab} />
          </div>
        ) : null}
      </EuiPanel>
    </RowFrame>
  );
};
SecurityEventRow.displayName = 'SecurityEventRow';

const formatChange = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '';

export interface ResponseEntryRowProps {
  entry: ActivityEntry;
  ts: number;
  offsetOrigin: number | undefined;
  isHighlighted: boolean;
  onNavigateTab: TabProps['onNavigateTab'];
}

export const ResponseEntryRow: React.FC<ResponseEntryRowProps> = ({
  entry,
  ts,
  offsetOrigin,
  isHighlighted,
  onNavigateTab,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChange = entry.before !== undefined || entry.after !== undefined;
  const details = entry.details ?? '';
  const isLongDetails = details.length > DETAILS_CLAMP_LENGTH;
  const canExpand = hasChange || isLongDetails;
  const shownDetails =
    isLongDetails && !isExpanded ? `${details.slice(0, DETAILS_CLAMP_LENGTH)}...` : details;

  return (
    <RowFrame
      id={`entry-${entry.id}`}
      ts={ts}
      offsetOrigin={offsetOrigin}
      lane="response"
      isHighlighted={isHighlighted}
      marker={<ActorAvatar actor={entry.actor} size="s" />}
    >
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder color="subdued">
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s">
              <strong data-test-subj="investigationTimelineTitle">{entry.message}</strong>
            </EuiText>
            {shownDetails ? (
              <EuiText size="s" color="subdued" data-test-subj="investigationTimelineDetails">
                <p>{shownDetails}</p>
              </EuiText>
            ) : null}
          </EuiFlexItem>
          {canExpand ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={isExpanded ? i18n.HIDE_DETAILS : i18n.SHOW_DETAILS}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType={isExpanded ? ICONS.chevronDown : ICONS.chevronRight}
                  color="text"
                  aria-label={isExpanded ? i18n.HIDE_DETAILS : i18n.SHOW_DETAILS}
                  aria-expanded={isExpanded}
                  onClick={() => setIsExpanded((expanded) => !expanded)}
                  data-test-subj="investigationTimelineExpand"
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {isExpanded && hasChange ? (
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            css={css`
              margin-block-start: ${euiTheme.size.s};
            `}
            data-test-subj="investigationTimelineChange"
          >
            {entry.before !== undefined ? (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {i18n.BEFORE}
                </EuiText>
                <EuiCodeBlock paddingSize="s" fontSize="s" whiteSpace="pre-wrap" isCopyable={false}>
                  {formatChange(entry.before)}
                </EuiCodeBlock>
              </EuiFlexItem>
            ) : null}
            {entry.after !== undefined ? (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {i18n.AFTER}
                </EuiText>
                <EuiCodeBlock paddingSize="s" fontSize="s" whiteSpace="pre-wrap" isCopyable={false}>
                  {formatChange(entry.after)}
                </EuiCodeBlock>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ) : null}
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          wrap
          responsive={false}
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{i18n.RESPONSE_BADGE}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ActorBadge actor={entry.actor} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <RelativeTime value={entry.ts} />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {entry.links.length > 0 ? (
          <div
            css={css`
              margin-block-start: ${euiTheme.size.s};
            `}
          >
            <LinkChips links={entry.links} onNavigateTab={onNavigateTab} />
          </div>
        ) : null}
      </EuiPanel>
    </RowFrame>
  );
};
ResponseEntryRow.displayName = 'ResponseEntryRow';
