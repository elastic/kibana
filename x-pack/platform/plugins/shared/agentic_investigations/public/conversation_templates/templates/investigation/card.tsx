/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { InvestigationSubjectResponse, InvestigationSummary } from '../../../../common';
import { SUBJECT_ICONS } from '../../../subjects/attachments/subject_view';
import { SUBJECT_TYPE_LABELS } from '../../../subjects/attachments/translations';
import { getInvestigationDisplayTitle, getSubjectLabel } from './to_view_model';
import {
  CLOSED_LABEL,
  INVESTIGATION_SEVERITY_COLORS,
  INVESTIGATION_SEVERITY_LABELS,
  NO_SEVERITY_LABEL,
  RUNNING_LABEL,
  moreSubjectsLabel,
  pendingProposalsLabel,
} from './translations';

const MAX_VISIBLE_ENTITIES = 3;

export interface InvestigationCardProps {
  investigation: InvestigationSummary;
  /** Makes the card a button; for example to open the conversation details flyout. */
  onClick?: (investigation: InvestigationSummary) => void;
  isSelected?: boolean;
}

const SubjectChip = ({ subjects }: { subjects: InvestigationSubjectResponse[] }) => {
  const [first] = subjects;
  if (!first) {
    return null;
  }
  return (
    <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
      <EuiBadge
        color="hollow"
        iconType={SUBJECT_ICONS[first.type]}
        title={SUBJECT_TYPE_LABELS[first.type]}
        data-test-subj="investigationCardSubject"
      >
        {getSubjectLabel(first)}
        {subjects.length > 1 ? ` ${moreSubjectsLabel(subjects.length - 1)}` : ''}
      </EuiBadge>
    </EuiFlexItem>
  );
};

const EntityChips = ({ investigation }: { investigation: InvestigationSummary }) => {
  const entities = investigation.impact?.entities ?? [];
  if (entities.length === 0) {
    return null;
  }
  const visible = entities.slice(0, MAX_VISIBLE_ENTITIES);
  const overflow = entities.length - visible.length;
  return (
    <>
      {visible.map((entity) => (
        <EuiFlexItem key={entity.id} grow={false}>
          <EuiBadge color="default" data-test-subj="investigationCardEntity">
            {entity.name ?? entity.id}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {overflow > 0 && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {moreSubjectsLabel(overflow)}
          </EuiText>
        </EuiFlexItem>
      )}
    </>
  );
};

/**
 * A compact investigation card: severity, title, running state, a two-line summary, what it is
 * about, the impacted entities, and how many proposed actions wait for a decision. Presentational;
 * the host supplies the investigation (from the list API) and decides what a click does.
 */
export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  investigation,
  onClick,
  isSelected = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const { metadata, in_progress: inProgress, created_at: createdAt } = investigation;
  const title = getInvestigationDisplayTitle(investigation);
  const { severity, summary, status } = metadata;
  const pending = investigation.pending_proposal_count ?? 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.(investigation);
    }
  };

  return (
    <div
      data-test-subj="investigationCard"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      onClick={onClick ? () => onClick(investigation) : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      css={css`
        padding: ${euiTheme.size.base};
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain};
        ${onClick ? 'cursor: pointer;' : ''}
        ${onClick && !isSelected
          ? `&:hover { background: ${euiTheme.colors.backgroundBaseSubdued}; }`
          : ''}
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="dot"
                color={severity ? INVESTIGATION_SEVERITY_COLORS[severity] : 'subdued'}
                content={severity ? INVESTIGATION_SEVERITY_LABELS[severity] : NO_SEVERITY_LABEL}
                aria-label={severity ? INVESTIGATION_SEVERITY_LABELS[severity] : NO_SEVERITY_LABEL}
                iconProps={{ 'data-test-subj': 'investigationCardSeverity' }}
              />
            </EuiFlexItem>
            <EuiFlexItem css={{ minWidth: 0 }}>
              <EuiText size="s">
                <p
                  className="eui-textTruncate"
                  title={title}
                  css={css`
                    margin: 0;
                    font-weight: ${euiTheme.font.weight.semiBold};
                  `}
                  data-test-subj="investigationCardTitle"
                >
                  {title}
                </p>
              </EuiText>
            </EuiFlexItem>
            {inProgress && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="dot"
                  color="primary"
                  content={RUNNING_LABEL}
                  aria-label={RUNNING_LABEL}
                  iconProps={{ 'data-test-subj': 'investigationCardRunning' }}
                />
              </EuiFlexItem>
            )}
            {status === 'closed' && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{CLOSED_LABEL}</EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedRelative value={createdAt} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {summary && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <p
                data-test-subj="investigationCardSummary"
                css={css`
                  margin: 0;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                `}
              >
                {summary}
              </p>
            </EuiText>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <SubjectChip subjects={investigation.subjects} />
            <EntityChips investigation={investigation} />
            {pending > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent" data-test-subj="investigationCardPendingProposals">
                  {pendingProposalsLabel(pending)}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
