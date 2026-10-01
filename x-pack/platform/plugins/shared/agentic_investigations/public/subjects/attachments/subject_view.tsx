/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import type {
  InvestigationSubject,
  InvestigationSubjectType,
} from '../../../common/subjects/subject';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';
import { SUBJECT_TYPE_LABELS, slackChannelLabel } from './translations';

const VIEW_ALERT = i18n.translate('xpack.agenticInvestigations.subjects.viewAlert', {
  defaultMessage: 'View alert',
});

const OPEN_SLACK_THREAD = i18n.translate('xpack.agenticInvestigations.subjects.openSlackThread', {
  defaultMessage: 'Open thread',
});

const SUBJECT_ICONS: Record<InvestigationSubjectType, IconType> = {
  alert: 'bell',
  significant_event: 'bolt',
  manual: 'question',
  slack_thread: 'logoSlack',
};

/**
 * Alert URLs come from the rule type: a Kibana path or an absolute URL. Anything else (for
 * example a `javascript:` URL) is not rendered as a link.
 */
const isSafeHref = (url: string): boolean =>
  (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url);

const AlertDetails = ({ subject }: { subject: InvestigationSubject }) => {
  const { snapshot, summary, subjectId } = subject;
  const url = snapshot?.url && isSafeHref(snapshot.url) ? snapshot.url : undefined;
  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong data-test-subj="investigationSubjectTitle">
              {snapshot?.rule_name ?? summary ?? subjectId}
            </strong>
          </EuiText>
        </EuiFlexItem>
        {snapshot?.status && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="investigationSubjectAlertStatus">
              {snapshot.status}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {url && (
          <EuiFlexItem grow={false}>
            <EuiLink href={url} data-test-subj="investigationSubjectAlertLink">
              {VIEW_ALERT}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {snapshot?.reason && (
        <EuiText size="s" color="subdued" data-test-subj="investigationSubjectAlertReason">
          {snapshot.reason}
        </EuiText>
      )}
    </>
  );
};

const SlackThreadDetails = ({ subject }: { subject: InvestigationSubject }) => {
  const { slack, summary, subjectId } = subject;
  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        {slack && (
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong data-test-subj="investigationSubjectSlackChannel">
                {slackChannelLabel(slack.channel)}
              </strong>
            </EuiText>
          </EuiFlexItem>
        )}
        {slack?.permalink && (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={slack.permalink}
              target="_blank"
              external
              data-test-subj="investigationSubjectSlackLink"
            >
              {OPEN_SLACK_THREAD}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="s" data-test-subj="investigationSubjectSummary">
        {summary ?? subjectId}
      </EuiText>
    </>
  );
};

const TextDetails = ({ subject: { summary, subjectId } }: { subject: InvestigationSubject }) => (
  <EuiText size="s" data-test-subj="investigationSubjectSummary">
    {summary ?? subjectId}
  </EuiText>
);

/** One row per subject: an icon for its type, then what the subject is, by type. */
export const SubjectRow: React.FC<{ subject: InvestigationSubject }> = ({ subject }) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="flexStart"
    responsive={false}
    data-test-subj={`investigationSubject-${subject.subjectType}`}
  >
    <EuiFlexItem grow={false}>
      <EuiIcon
        type={SUBJECT_ICONS[subject.subjectType]}
        aria-label={SUBJECT_TYPE_LABELS[subject.subjectType]}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      {subject.subjectType === 'alert' && <AlertDetails subject={subject} />}
      {subject.subjectType === 'slack_thread' && <SlackThreadDetails subject={subject} />}
      {(subject.subjectType === 'significant_event' || subject.subjectType === 'manual') && (
        <TextDetails subject={subject} />
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);

/** An investigation subject, the same inline in the chat and in the details flyout. */
export const SubjectView: React.FC<InvestigationAttachmentContentProps<InvestigationSubject>> = ({
  document,
}) => <SubjectRow subject={document} />;
