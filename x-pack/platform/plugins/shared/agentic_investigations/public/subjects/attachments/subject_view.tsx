/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, EuiIconTip, EuiPanel, EuiText, euiTextTruncate, useEuiTheme } from '@elastic/eui';
import type {
  InvestigationSubject,
  InvestigationSubjectType,
} from '../../../common/subjects/subject';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';
import { getSubjectDisplayType, getSubjectTitle, type SubjectRowData } from './subject_title';
import { useAlertsListLink, useSubjectLink } from './subject_link';
import { useSubjectFlyout } from './use_subject_flyout';
import {
  OPEN_IN_FLYOUT,
  OPEN_NEW_TAB,
  OPENS_IN_NEW_TAB,
  TRIGGER_LABEL,
  alertsCountLabel,
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
        inline-size: ${euiTheme.size.xl};
        block-size: ${euiTheme.size.xl};
        border-radius: 50%;
        border: ${border};
        background: ${background};
      `}
    >
      <EuiIcon type={iconType} size="m" color={color} aria-hidden={true} />
    </span>
  );
};

interface CompactRowProps {
  iconType: IconType;
  tone: SubjectIconTone;
  title: string;
  description: React.ReactNode;
  /** Makes the row a link; an external link opens in a new tab. */
  href?: string;
  isExternal?: boolean;
  /** Opens `href` inside Kibana instead of loading the page again, or opens the flyout. */
  onLinkClick?: (event: React.MouseEvent) => void;
  opensFlyout?: boolean;
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
  onLinkClick,
  opensFlyout = false,
  onToggle,
  isExpanded,
  isNested = false,
  'data-test-subj': dataTestSubj,
}: CompactRowProps) => {
  const { euiTheme } = useEuiTheme();
  const isInteractive = href !== undefined || onToggle !== undefined || opensFlyout;
  const hasTrailingIcon = onToggle !== undefined || opensFlyout || isExternal;
  const isTrailingHoverOnly = onToggle === undefined;
  const toggleIcon = isExpanded ? 'chevronSingleUp' : 'chevronSingleDown';

  const rowStyles = css`
    display: grid;
    grid-template-columns: ${euiTheme.size.xl} minmax(0, 1fr) ${hasTrailingIcon ? 'auto' : ''};
    column-gap: ${euiTheme.size.m};
    align-items: center;
    box-sizing: border-box;
    inline-size: 100%;
    margin: 0;
    padding: ${euiTheme.size.m} ${euiTheme.size.base};
    ${isNested &&
    `padding-inline-start: calc(${euiTheme.size.base} + ${euiTheme.size.xl} + ${euiTheme.size.m});`}
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    text-decoration: none;
    ${isTrailingHoverOnly && `--subject-trailing-opacity: 0;`}
    ${isInteractive &&
    css`
      cursor: pointer;
      &:hover,
      &:focus-visible {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        text-decoration: none;
        --subject-trailing-opacity: 1;
      }
      &:focus-visible {
        outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
        outline-offset: -${euiTheme.focus.width};
      }
    `}
  `;
  const trailingStyles = css`
    display: inline-flex;
    opacity: var(--subject-trailing-opacity, 1);
    transition: opacity ${euiTheme.animation.fast} ease-in;
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
      {onToggle !== undefined && <EuiIcon type={toggleIcon} size="m" color="subdued" aria-hidden />}
      {onToggle === undefined && opensFlyout && (
        <span css={trailingStyles}>
          <EuiIconTip
            type="maximize"
            size="m"
            color="subdued"
            content={OPEN_IN_FLYOUT}
            aria-label={OPEN_IN_FLYOUT}
            iconProps={{ tabIndex: -1 }}
          />
        </span>
      )}
      {onToggle === undefined && !opensFlyout && isExternal && (
        <span css={trailingStyles}>
          <EuiIconTip
            type="external"
            size="m"
            color="subdued"
            content={OPEN_NEW_TAB}
            aria-label={OPENS_IN_NEW_TAB}
            iconProps={{ tabIndex: -1, 'data-test-subj': 'investigationSubjectExternal' }}
          />
        </span>
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <a
        href={href}
        onClick={onLinkClick}
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
  if (opensFlyout) {
    return (
      <button type="button" css={rowStyles} onClick={onLinkClick} data-test-subj={dataTestSubj}>
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

/**
 * The subdued line under a row's title. Alerts listed under an "N alerts" row usually share the
 * rule name, so they also show when each alert started.
 */
const getSubjectDescription = (subject: SubjectRowData, isNested: boolean): React.ReactNode => {
  const { type, snapshot } = subject;
  const start =
    type === 'alert' && isNested && snapshot?.start ? new Date(snapshot.start) : undefined;
  if (start === undefined || Number.isNaN(start.getTime())) {
    return subjectTriggerLabel(getSubjectDisplayType(subject));
  }
  return (
    <FormattedMessage
      id="xpack.agenticInvestigations.subjects.nestedAlertTriggerLabel"
      defaultMessage="Trigger · Alert · {start}"
      values={{
        start: (
          <FormattedTime
            value={start}
            month="short"
            day="numeric"
            hour="2-digit"
            minute="2-digit"
            second="2-digit"
            hourCycle="h23"
          />
        ),
      }}
    />
  );
};

/**
 * One compact row per subject: an icon for its type, what it is called, and "Trigger · <type>".
 * The row links where `useSubjectLink` says (the subject's page, else its own link); without a
 * link it is plain text.
 */
export const SubjectRow: React.FC<{ subject: SubjectRowData; isNested?: boolean }> = ({
  subject,
  isNested = false,
}) => {
  const { href, onClick: onLinkClick, isExternal } = useSubjectLink(subject);
  const {
    onClick: onRowClick,
    flyout,
    canOpenFlyout,
  } = useSubjectFlyout(subject, href, { onLinkClick });
  const displayType = getSubjectDisplayType(subject);

  return (
    <>
      <CompactRow
        iconType={SUBJECT_ICONS[displayType]}
        tone={SUBJECT_ICON_TONES[displayType]}
        title={getSubjectTitle(subject)}
        description={getSubjectDescription(subject, isNested)}
        href={href}
        isExternal={isExternal}
        onLinkClick={onRowClick}
        opensFlyout={canOpenFlyout}
        isNested={isNested}
        data-test-subj={`investigationSubject-${subject.type}`}
      />
      {flyout}
    </>
  );
};

const subjectKey = ({ type, id }: SubjectRowData): string => `${type}:${id}`;

/**
 * The alerts an investigation is about, as one "N alerts" row that opens the alerts list filtered
 * to them. Without that list (alerting v2 not available) the row lists the alerts inline instead.
 */
const AlertsSubjectRows: React.FC<{ alerts: SubjectRowData[] }> = ({ alerts }) => {
  const { href } = useAlertsListLink(alerts);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <CompactRow
        iconType={SUBJECT_ICONS.alert}
        tone={SUBJECT_ICON_TONES.alert}
        title={alertsCountLabel(alerts.length)}
        description={TRIGGER_LABEL}
        href={href}
        isExternal={href !== undefined}
        onToggle={href === undefined ? () => setIsExpanded((expanded) => !expanded) : undefined}
        isExpanded={href === undefined ? isExpanded : undefined}
        data-test-subj="investigationSubject-alerts"
      />
      {href === undefined &&
        isExpanded &&
        alerts.map((alert) => <SubjectRow key={subjectKey(alert)} subject={alert} isNested />)}
    </>
  );
};

/**
 * An investigation's subjects in one bordered list. Several alerts collapse into one "N alerts"
 * row, which opens the alerts list filtered to them.
 */
export const SubjectList: React.FC<{ subjects: SubjectRowData[] }> = ({
  subjects: allSubjects,
}) => {
  const { euiTheme } = useEuiTheme();
  const subjects = useMemo(
    () =>
      allSubjects.filter(
        ({ type, trigger_type: triggerType }) => type !== 'slack_thread' || triggerType
      ),
    [allSubjects]
  );
  const alerts = useMemo(() => subjects.filter(({ type }) => type === 'alert'), [subjects]);

  const rows = useMemo(() => {
    const firstAlert = alerts.length > 1 ? alerts[0] : undefined;
    return subjects.flatMap((subject) => {
      if (firstAlert === undefined || subject.type !== 'alert') {
        return [<SubjectRow key={subjectKey(subject)} subject={subject} />];
      }
      if (subject !== firstAlert) {
        return [];
      }
      return [<AlertsSubjectRows key="alerts" alerts={alerts} />];
    });
  }, [subjects, alerts]);

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
