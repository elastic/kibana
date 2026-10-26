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
import { EuiIcon, EuiPanel, EuiText, euiTextTruncate, useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  InvestigationSubject,
  InvestigationSubjectType,
} from '../../../common/subjects/subject';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';
import { getSubjectTitle, type SubjectRowData } from './subject_title';
import { isModifiedClick, useAlertsListLink, useSubjectLink } from './subject_link';
import { canOpenSubjectFlyout, type SubjectServices } from './subject_services';
import {
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
  description: React.ReactNode;
  /** Makes the row a link; Slack threads open in a new tab. */
  href?: string;
  isExternal?: boolean;
  /** Opens `href` inside Kibana instead of loading the page again. */
  onLinkClick?: (event: React.MouseEvent) => void;
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
const getSubjectDescription = (
  { type, snapshot }: SubjectRowData,
  isNested: boolean
): React.ReactNode => {
  const start =
    type === 'alert' && isNested && snapshot?.start ? new Date(snapshot.start) : undefined;
  if (start === undefined || Number.isNaN(start.getTime())) {
    return subjectTriggerLabel(type);
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
  const { services } = useKibana<SubjectServices>();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const alertVersion = subject.snapshot?.alert_version;
  // An alert opens next to the investigation; everything else keeps its link.
  const opensFlyout = subject.type === 'alert' && canOpenSubjectFlyout(services, alertVersion);

  const onRowClick = (event: React.MouseEvent) => {
    if (!opensFlyout) {
      onLinkClick?.(event);
      return;
    }
    // A new-tab or new-window click keeps the browser's own behavior, so `href` still matters.
    if (isModifiedClick(event)) {
      return;
    }
    event.preventDefault();
    setIsFlyoutOpen(true);
  };

  return (
    <>
      <CompactRow
        iconType={SUBJECT_ICONS[subject.type]}
        tone={SUBJECT_ICON_TONES[subject.type]}
        title={getSubjectTitle(subject)}
        description={getSubjectDescription(subject, isNested)}
        href={href}
        isExternal={isExternal}
        onLinkClick={href === undefined ? undefined : onRowClick}
        isNested={isNested}
        data-test-subj={`investigationSubject-${subject.type}`}
      />
      {isFlyoutOpen && (
        <React.Suspense fallback={null}>
          <LazySubjectDetailsFlyout
            alertId={subject.id}
            alertVersion={alertVersion}
            detailsHref={href}
            onClose={() => setIsFlyoutOpen(false)}
            services={services}
          />
        </React.Suspense>
      )}
    </>
  );
};

/** The flyout pulls in the alerting v2 episode UI, so it loads when a subject is clicked. */
const LazySubjectDetailsFlyout = React.lazy(async () => {
  const { SubjectDetailsFlyout } = await import('./subject_details_flyout');
  return { default: SubjectDetailsFlyout };
});

const subjectKey = ({ type, id }: SubjectRowData): string => `${type}:${id}`;

/**
 * The alerts an investigation is about, as one "N alerts" row that opens the alerts list filtered
 * to them. Without that list (alerting v2 not available) the row lists the alerts inline instead.
 */
const AlertsSubjectRows: React.FC<{ alerts: SubjectRowData[] }> = ({ alerts }) => {
  const { href, onClick } = useAlertsListLink(alerts);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <CompactRow
        iconType={SUBJECT_ICONS.alert}
        tone={SUBJECT_ICON_TONES.alert}
        title={alertsCountLabel(alerts.length)}
        description={TRIGGER_LABEL}
        href={href}
        onLinkClick={onClick}
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
export const SubjectList: React.FC<{ subjects: SubjectRowData[] }> = ({ subjects }) => {
  const { euiTheme } = useEuiTheme();
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
