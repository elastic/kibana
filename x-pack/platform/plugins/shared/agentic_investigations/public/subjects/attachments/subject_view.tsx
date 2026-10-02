/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, EuiText, euiTextTruncate, useEuiTheme } from '@elastic/eui';
import type {
  InvestigationSubject,
  InvestigationSubjectType,
} from '../../../common/subjects/subject';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';
import { getSubjectTitle, type SubjectRowData } from './subject_title';
import { OPENS_IN_NEW_TAB, subjectTriggerLabel } from './translations';

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
  'data-test-subj': string;
}

/**
 * One line of what a subject is, under it one subdued line of its kind; the whole row is the
 * link when it has one.
 */
const CompactRow = ({
  iconType,
  tone,
  title,
  description,
  href,
  isExternal = false,
  'data-test-subj': dataTestSubj,
}: CompactRowProps) => {
  const { euiTheme } = useEuiTheme();
  const isInteractive = href !== undefined;

  const rowStyles = css`
    display: grid;
    grid-template-columns: ${euiTheme.size.l} minmax(0, 1fr) ${isExternal ? 'auto' : ''};
    column-gap: ${euiTheme.size.m};
    align-items: center;
    box-sizing: border-box;
    inline-size: 100%;
    margin: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
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
      {isExternal && (
        <EuiIcon
          type="external"
          size="s"
          color="subdued"
          aria-label={OPENS_IN_NEW_TAB}
          data-test-subj="investigationSubjectExternal"
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
  return (
    <div css={rowStyles} data-test-subj={dataTestSubj}>
      {content}
    </div>
  );
};

/**
 * One compact row per subject: an icon for its type, what it is called, and "Trigger · <type>".
 * Alerts link to their `kibana.alert.url` and Slack threads to the thread; other subjects do not link.
 */
export const SubjectRow: React.FC<{ subject: SubjectRowData }> = ({ subject }) => {
  const href = getSubjectHref(subject);
  return (
    <CompactRow
      iconType={SUBJECT_ICONS[subject.type]}
      tone={SUBJECT_ICON_TONES[subject.type]}
      title={getSubjectTitle(subject)}
      description={subjectTriggerLabel(subject.type)}
      href={href}
      isExternal={href !== undefined && subject.type === 'slack_thread'}
      data-test-subj={`investigationSubject-${subject.type}`}
    />
  );
};

/** An investigation subject, the same compact row inline in the chat and in the details flyout. */
export const SubjectView: React.FC<InvestigationAttachmentContentProps<InvestigationSubject>> = ({
  document: { subjectType, subjectId, summary, snapshot, slack },
}) => <SubjectRow subject={{ type: subjectType, id: subjectId, summary, snapshot, slack }} />;
