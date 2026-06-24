/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SigEvent } from '@kbn/streams-schema';

const ROOT_CAUSE_LABEL = i18n.translate('xpack.streams.sigEvent.rootCauseCard.rootCauseLabel', {
  defaultMessage: 'Root cause',
});

const EVIDENCE_TRAIL_LABEL = i18n.translate(
  'xpack.streams.sigEvent.rootCauseCard.evidenceTrailLabel',
  { defaultMessage: 'Evidence trail' }
);

const NO_ROOT_CAUSE_LABEL = i18n.translate('xpack.streams.sigEvent.rootCauseCard.noRootCause', {
  defaultMessage: 'No working theory was generated for this event.',
});

const VERDICT_LABEL = i18n.translate('xpack.streams.sigEvent.rootCauseCard.verdictLabel', {
  defaultMessage: 'Verdict',
});

const EVIDENCE_RESULT_LABELS = {
  found: i18n.translate('xpack.streams.sigEvent.rootCauseCard.result.found', {
    defaultMessage: 'Rows found',
  }),
  empty: i18n.translate('xpack.streams.sigEvent.rootCauseCard.result.empty', {
    defaultMessage: 'No rows',
  }),
  error: i18n.translate('xpack.streams.sigEvent.rootCauseCard.result.error', {
    defaultMessage: 'Query error',
  }),
} as const;

const EVIDENCE_CONFIRMED_LABEL = i18n.translate(
  'xpack.streams.sigEvent.rootCauseCard.confirmedLabel',
  { defaultMessage: 'Confirmed' }
);

const EVIDENCE_PENDING_LABEL = i18n.translate('xpack.streams.sigEvent.rootCauseCard.pendingLabel', {
  defaultMessage: 'Pending verification',
});

// Confidence is unconstrained in the schema and producers use either 0-1 or 0-100.
// Normalize to a 0-100 percentage for display.
const normalizeConfidence = (confidence: number | undefined): number | undefined => {
  if (confidence == null || isNaN(confidence)) return undefined;
  return confidence > 0 && confidence <= 1 ? confidence * 100 : confidence;
};

const confidenceBadgeColor = (
  confidence: number | undefined
): 'success' | 'warning' | 'danger' | 'hollow' => {
  if (confidence == null) return 'hollow';
  if (confidence >= 70) return 'success';
  if (confidence >= 40) return 'warning';
  return 'danger';
};

type Evidence = NonNullable<SigEvent['evidences']>[number];

interface RootCauseCardProps {
  event: SigEvent;
}

export const RootCauseCard = ({ event }: RootCauseCardProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const evidences = event.evidences ?? [];
  const hasEvidences = evidences.length > 0;
  const hasRootCause = Boolean(event.root_cause);

  if (!hasRootCause && !hasEvidences) {
    return null;
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      <RootCauseHeader event={event} />
      {hasEvidences && (
        <div
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.base};
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            border-bottom-left-radius: ${euiTheme.border.radius.medium};
            border-bottom-right-radius: ${euiTheme.border.radius.medium};
          `}
        >
          <EvidenceTrail evidences={evidences} />
        </div>
      )}
    </EuiPanel>
  );
};

const RootCauseHeader = ({ event }: { event: SigEvent }) => {
  return (
    <EuiPanel
      color="transparent"
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      borderRadius="none"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{ROOT_CAUSE_LABEL}</EuiBadge>
        </EuiFlexItem>
        {(() => {
          const confidence = normalizeConfidence(event.confidence);
          if (confidence == null) return null;
          return (
            <EuiFlexItem grow={false}>
              <EuiBadge color={confidenceBadgeColor(confidence)}>
                {`${Math.round(confidence)}%`}
              </EuiBadge>
            </EuiFlexItem>
          );
        })()}
      </EuiFlexGroup>

      {event.title && (
        <EuiTitle size="xxs">
          <h6
            css={css`
              margin-top: 12px;
            `}
          >
            {event.title}
          </h6>
        </EuiTitle>
      )}

      <EuiText
        size="xs"
        color={event.root_cause ? 'default' : 'subdued'}
        css={css`
          margin-top: 8px;
        `}
      >
        <p>{event.root_cause || NO_ROOT_CAUSE_LABEL}</p>
      </EuiText>
    </EuiPanel>
  );
};

const EvidenceTrail = ({ evidences }: { evidences: Evidence[] }) => {
  const trailId = useGeneratedHtmlId({ prefix: 'evidenceTrail' });

  return (
    <EuiAccordion
      id={trailId}
      arrowDisplay="left"
      paddingSize="s"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{EVIDENCE_TRAIL_LABEL}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{evidences.length}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {evidences.map((evidence, idx) => (
          <EuiFlexItem grow={false} key={`evidence-${idx}`}>
            <EvidenceRow evidence={evidence} index={idx} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

const EvidenceRow = ({ evidence, index }: { evidence: Evidence; index: number }) => {
  const euiThemeContext = useEuiTheme();
  const rowId = useGeneratedHtmlId({ prefix: `evidence-${index}` });
  const [isOpen, setIsOpen] = useState(false);

  const dotColor = evidenceDotColor(evidence, euiThemeContext);

  const titleLabel =
    evidence.rule_name ||
    evidence.description ||
    i18n.translate('xpack.streams.sigEvent.rootCauseCard.unnamedEvidence', {
      defaultMessage: 'Unnamed evidence',
    });

  const statusLabel = evidenceStatusLabel(evidence);

  const buttonContent = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="dot"
          size="m"
          color={dotColor}
          aria-label={statusLabel}
          content={statusLabel}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          size="xs"
          css={css`
            white-space: normal;
            text-align: left;
          `}
        >
          <strong>{titleLabel}</strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const extraAction = evidence.stream_name ? (
    <EuiBadge color="hollow">{evidence.stream_name}</EuiBadge>
  ) : undefined;

  return (
    <EuiAccordion
      id={rowId}
      arrowDisplay="left"
      paddingSize="s"
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      buttonContent={buttonContent}
      extraAction={extraAction}
    >
      <EvidenceBody evidence={evidence} />
    </EuiAccordion>
  );
};

const EvidenceBody = ({ evidence }: { evidence: Evidence }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      color="plain"
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      css={css`
        margin-top: 8px;
        margin-left: 24px;
      `}
    >
      <EuiText size="xs">
        <strong>{VERDICT_LABEL}</strong>
      </EuiText>
      {evidence.description && (
        <EuiText
          size="s"
          css={css`
            margin-top: 8px;
            font-family: ${euiTheme.font.familyCode};
          `}
        >
          <p>{evidence.description}</p>
        </EuiText>
      )}
    </EuiPanel>
  );
};

const evidenceStatusLabel = (evidence: Evidence): string => {
  const resultLabel = evidence.result
    ? EVIDENCE_RESULT_LABELS[evidence.result as keyof typeof EVIDENCE_RESULT_LABELS] ??
      evidence.result
    : undefined;

  if (evidence.confirmed) {
    return resultLabel
      ? `${EVIDENCE_CONFIRMED_LABEL} \u00b7 ${resultLabel}`
      : EVIDENCE_CONFIRMED_LABEL;
  }
  if (resultLabel) {
    return resultLabel;
  }
  return EVIDENCE_PENDING_LABEL;
};

const evidenceDotColor = (evidence: Evidence, euiThemeContext: UseEuiTheme): string => {
  const { euiTheme } = euiThemeContext;
  if (evidence.confirmed) {
    return euiTheme.colors.textSuccess;
  }
  switch (evidence.result) {
    case 'error':
      return euiTheme.colors.textDanger;
    case 'found':
      return euiTheme.colors.textWarning;
    case 'empty':
      return euiTheme.colors.textSubdued;
    default:
      return euiTheme.colors.borderBaseSubdued;
  }
};
