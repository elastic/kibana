/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import moment from 'moment';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, EuiPanel, EuiText, euiTextTruncate, useEuiTheme } from '@elastic/eui';
import type {
  InvestigationSubject,
  InvestigationSubjectType,
} from '../../../common/subjects/subject';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';
import { getSubjectTitle, type SubjectRowData } from './subject_title';
import {
  OPENS_IN_NEW_TAB,
  TRIGGER_LABEL,
  alertsCountLabel,
  nestedAlertTriggerLabel,
  subjectTriggerLabel,
} from './translations';

const SUBJECT_ICONS: Record<InvestigationSubjectType, IconType> = {
  alert: 'warning',
  significant_event: 'sparkles',
  manual: 'question',
  slack_thread: 'logoSlack',
};

type SubjectIconTone = 'danger' | 'neutral' | 'logo';

const SUBJECT_ICON_TONES: Record<InvestigationSubjectType, SubjectIconTone> = {
  alert: 'danger',
  significant_event: 'danger',
  manual: 'neutral',
  slack_thread: 'logo',
};

/**
 * Alert URLs come from the rule type: a Kibana path or an absolute URL. Anything else (for
 * example a `javascript:` URL) is not rendered as a link.
 */
const isSafeHref = (url: string): boolean =>
  (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url);

/** Slack permalinks are validated as HTTPS on write; checked again because the row is a raw link. */
const isSafeSlackHref = (url: string): boolean => /^https:\/\//i.test(url);

/**
 * Where a click on the row goes: the alert's `kibana.alert.url` (whatever the rule type writes
 * there, for example a Discover link) or the Slack thread.
 */
const getSubjectHref = ({ type, snapshot, slack }: SubjectRowData): string | undefined => {
  if (type === 'alert') {
    return snapshot?.url && isSafeHref(snapshot.url) ? snapshot.url : undefined;
  }
  if (type === 'slack_thread') {
    return slack?.permalink && isSafeSlackHref(slack.permalink) ? slack.permalink : undefined;
  }
  return undefined;
};

const SubjectIcon = ({ iconType, tone }: { iconType: IconType; tone: SubjectIconTone }) => {
  const { euiTheme } = useEuiTheme();
  const { background, color, border } = {
    danger: {
      background: euiTheme.colors.backgroundLightDanger,
      color: euiTheme.colors.textDanger,
      border: 'none',
    },
    neutral: {
      background: euiTheme.colors.backgroundLightText,
      color: euiTheme.colors.textSubdued,
      border: 'none',
    },
    logo: {
      background: euiTheme.colors.backgroundBasePlain,
      color: undefined,
      border: euiTheme.border.thin,
    },
  }[tone];
  return (
    <span
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        inline-size: ${euiTheme.size.l};
        block-size: ${euiTheme.size.l};
        border-radius: 50%;
        border: ${border};
        background: ${background};
      `}
    >
      <EuiIcon type={iconType} size="s" color={color} aria-hidden={true} />
    </span>
  );
};

interface CompactRowProps {
  iconType: IconType;
  tone: SubjectIconTone;
  title: string;
  description: string;
  /** Makes the row a link; Slack threads open in a new tab. */
  href?: string;
  isExternal?: boolean;
  /** Makes the row a button that shows or hides more rows. */
  onToggle?: () => void;
  isExpanded?: boolean;
  /** Indents a row shown under a summary row, so its icon lines up with the summary's title. */
  isNested?: boolean;
  'data-test-subj': string;
}

/**
 * One line of what a subject is, under it one subdued line of its kind; the whole row is the
 * link (or toggle) when it has one.
 */
const CompactRow = ({
  iconType,
  tone,
  title,
  description,
  href,
  isExternal = false,
  onToggle,
  isExpanded,
  isNested = false,
  'data-test-subj': dataTestSubj,
}: CompactRowProps) => {
  const { euiTheme } = useEuiTheme();
  const isInteractive = href !== undefined || onToggle !== undefined;
  const toggleIcon = isExpanded ? 'chevronSingleUp' : 'chevronSingleDown';
  const trailingIcon = onToggle ? toggleIcon : 'external';
  const hasTrailingIcon = onToggle !== undefined || isExternal;

  const rowStyles = css`
    display: grid;
    grid-template-columns: ${euiTheme.size.l} minmax(0, 1fr) ${hasTrailingIcon ? 'auto' : ''};
    column-gap: ${euiTheme.size.m};
    align-items: center;
    box-sizing: border-box;
    inline-size: 100%;
    margin: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    ${isNested && `padding-inline-start: calc(${euiTheme.size.m} * 2 + ${euiTheme.size.l});`}
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    text-decoration: none;
    ${isInteractive &&
    css`
      cursor: pointer;
      &:hover {
        background: ${euiTheme.colors.backgroundBaseSubdued};
        text-decoration: none;
      }
      &:focus-visible {
        outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
        outline-offset: -${euiTheme.focus.width};
      }
    `}
  `;
  const textStyles = css`
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  `;
  const titleStyles = css`
    ${euiTextTruncate()}
    font-weight: ${euiTheme.font.weight.medium};
  `;

  const content = (
    <>
      <SubjectIcon iconType={iconType} tone={tone} />
      <span css={textStyles}>
        <EuiText
          size="s"
          component="span"
          title={title}
          css={titleStyles}
          data-test-subj="investigationSubjectTitle"
        >
          {title}
        </EuiText>
        <EuiText
          size="xs"
          color="subdued"
          component="span"
          css={css(euiTextTruncate())}
          data-test-subj="investigationSubjectTrigger"
        >
          {description}
        </EuiText>
      </span>
      {hasTrailingIcon && (
        <EuiIcon
          type={trailingIcon}
          size="s"
          color="subdued"
          {...(isExternal
            ? { 'aria-label': OPENS_IN_NEW_TAB, 'data-test-subj': 'investigationSubjectExternal' }
            : { 'aria-hidden': true })}
        />
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <a
        href={href}
        css={rowStyles}
        data-test-subj={dataTestSubj}
        {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {content}
      </a>
    );
  }
  if (onToggle !== undefined) {
    return (
      <button
        type="button"
        css={rowStyles}
        onClick={onToggle}
        aria-expanded={isExpanded}
        data-test-subj={dataTestSubj}
      >
        {content}
      </button>
    );
  }
  return (
    <div css={rowStyles} data-test-subj={dataTestSubj}>
      {content}
    </div>
  );
};

const NESTED_ALERT_START_FORMAT = 'MMM D, HH:mm:ss';

/**
 * The subdued line under a row's title. Alerts listed under an "N alerts" row usually share the
 * rule name, so they also show when each alert started.
 */
const getSubjectDescription = ({ type, snapshot }: SubjectRowData, isNested: boolean): string => {
  const start =
    type === 'alert' && isNested && snapshot?.start ? moment(snapshot.start) : undefined;
  return start?.isValid()
    ? nestedAlertTriggerLabel(start.format(NESTED_ALERT_START_FORMAT))
    : subjectTriggerLabel(type);
};

/**
 * One compact row per subject: an icon for its type, what it is called, and "Trigger · <type>".
 * Alerts link to their `kibana.alert.url` and Slack threads to the thread; other subjects do not link.
 */
export const SubjectRow: React.FC<{ subject: SubjectRowData; isNested?: boolean }> = ({
  subject,
  isNested = false,
}) => {
  const href = getSubjectHref(subject);
  return (
    <CompactRow
      iconType={SUBJECT_ICONS[subject.type]}
      tone={SUBJECT_ICON_TONES[subject.type]}
      title={getSubjectTitle(subject)}
      description={getSubjectDescription(subject, isNested)}
      href={href}
      isExternal={href !== undefined && subject.type === 'slack_thread'}
      isNested={isNested}
      data-test-subj={`investigationSubject-${subject.type}`}
    />
  );
};

const subjectKey = ({ type, id }: SubjectRowData): string => `${type}:${id}`;

/**
 * An investigation's subjects in one bordered list. Several alerts collapse into one "N alerts"
 * row that shows them when clicked, since they have no shared page to link to.
 */
export const SubjectList: React.FC<{ subjects: SubjectRowData[] }> = ({ subjects }) => {
  const { euiTheme } = useEuiTheme();
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
  const alerts = subjects.filter(({ type }) => type === 'alert');
  const firstAlert = alerts.length > 1 ? alerts[0] : undefined;

  const rows = subjects.flatMap((subject) => {
    if (firstAlert === undefined || subject.type !== 'alert') {
      return [<SubjectRow key={subjectKey(subject)} subject={subject} />];
    }
    if (subject !== firstAlert) {
      return [];
    }
    return [
      <CompactRow
        key="alerts"
        iconType={SUBJECT_ICONS.alert}
        tone={SUBJECT_ICON_TONES.alert}
        title={alertsCountLabel(alerts.length)}
        description={TRIGGER_LABEL}
        onToggle={() => setIsAlertsExpanded((expanded) => !expanded)}
        isExpanded={isAlertsExpanded}
        data-test-subj="investigationSubject-alerts"
      />,
      ...(isAlertsExpanded
        ? alerts.map((alert) => <SubjectRow key={subjectKey(alert)} subject={alert} isNested />)
        : []),
    ];
  });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        overflow: hidden;
        & > * + * {
          border-block-start: ${euiTheme.border.thin};
        }
      `}
      data-test-subj="investigationSubjectList"
    >
      {rows}
    </EuiPanel>
  );
};

/** An investigation subject, the same compact row inline in the chat and in the details flyout. */
export const SubjectView: React.FC<InvestigationAttachmentContentProps<InvestigationSubject>> = ({
  document: { subjectType, subjectId, summary, snapshot, slack },
}) => <SubjectRow subject={{ type: subjectType, id: subjectId, summary, snapshot, slack }} />;
