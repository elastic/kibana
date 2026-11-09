/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  Hypothesis,
  HypothesisStatus,
  InvestigationHypotheses,
} from '../../../common/hypotheses/hypotheses';
import { EventMarkdown } from '../../event_links/event_markdown';
import { LinkedEventCard } from '../../event_links/linked_event_card';
import { EvidenceView } from '../../evidence/evidence_view';
import { HYPOTHESIS_STATUS_LABELS, confidenceLabel } from './translations';
import type {
  InvestigationAttachmentContentProps,
  InvestigationAttachmentVariant,
} from '../../investigation_attachments';

const NO_HYPOTHESES = i18n.translate('xpack.agenticInvestigations.hypotheses.attachments.empty', {
  defaultMessage: 'No hypotheses recorded yet.',
});

const HYPOTHESIS_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.candidateLabel', {
  defaultMessage: 'Hypothesis:',
});

const NO_REASON = i18n.translate('xpack.agenticInvestigations.hypotheses.noReason', {
  defaultMessage: 'No reasoning recorded yet.',
});

const HYPOTHESIS_STATUS_ICONS: Record<Exclude<HypothesisStatus, 'investigating'>, string> = {
  dismissed: 'dashedCircle',
  confirmed: 'checkCircle',
};

const confidenceBadgeLabel = (confidence: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypotheses.confidenceBadge', {
    defaultMessage: '{confidence, number, percent}',
    values: { confidence },
  });

const HypothesisStatusIcon = ({ status }: { status: HypothesisStatus }) =>
  status === 'investigating' ? (
    <EuiLoadingSpinner
      size="s"
      aria-label={HYPOTHESIS_STATUS_LABELS[status]}
      data-test-subj={`investigationHypothesisStatus-${status}`}
    />
  ) : (
    <EuiIcon
      type={HYPOTHESIS_STATUS_ICONS[status]}
      color="text"
      title={HYPOTHESIS_STATUS_LABELS[status]}
      data-test-subj={`investigationHypothesisStatus-${status}`}
    />
  );

const TESTED_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.testedLabel', {
  defaultMessage: 'Tested',
});
const RESULT_LABEL = i18n.translate('xpack.agenticInvestigations.hypotheses.resultLabel', {
  defaultMessage: 'Result',
});

const TESTED_AND_RESULT = /^\s*\**Tested:?\**:?\s*([\s\S]*?)\s*\**Result:?\**:?\s*([\s\S]*?)\s*$/i;

/** The recorder writes a reason as "Tested: …" then "Result: …"; anything else stays whole. */
export const splitReason = (reason: string): { tested: string; result: string } | undefined => {
  const match = TESTED_AND_RESULT.exec(reason.replace(/\\n/g, '\n'));
  return match && match[1] && match[2] ? { tested: match[1], result: match[2] } : undefined;
};

const ReasonSection = ({
  label,
  testSubject,
  children,
}: {
  label: string;
  testSubject: string;
  children: React.ReactNode;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationHypothesisSection' });
  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen
      paddingSize="s"
      data-test-subj={testSubject}
      buttonContent={
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
      }
    >
      {children}
    </EuiAccordion>
  );
};

/**
 * A hypothesis's reason and, when given, its evidence charts. A reason in the recorder's
 * Tested / Result form is two collapsible sections; the Result shows the event card that backs it.
 */
export const HypothesisDetail = ({
  reason,
  evidence,
}: Pick<Hypothesis, 'reason' | 'evidence'>): React.ReactElement => {
  const sections = reason?.trim() ? splitReason(reason) : undefined;
  const charts = evidence?.map((item, index) => (
    <React.Fragment key={index}>
      <EuiSpacer size="s" />
      <EvidenceView evidence={item} />
    </React.Fragment>
  ));
  if (sections) {
    const resultCard = <LinkedEventCard text={sections.result} />;
    return (
      <div data-test-subj="investigationHypothesisReason">
        <ReasonSection label={TESTED_LABEL} testSubject="investigationHypothesisTested">
          <EventMarkdown text={sections.tested} />
        </ReasonSection>
        <EuiSpacer size="s" />
        <ReasonSection label={RESULT_LABEL} testSubject="investigationHypothesisResult">
          <EventMarkdown text={sections.result} />
          <EuiSpacer size="s" />
          {resultCard}
        </ReasonSection>
        {charts}
      </div>
    );
  }
  return (
    <>
      <div data-test-subj="investigationHypothesisReason">
        {reason?.trim() ? (
          <EventMarkdown text={reason} />
        ) : (
          <EuiText size="s" color="subdued">
            <p>{NO_REASON}</p>
          </EuiText>
        )}
      </div>
      {charts}
    </>
  );
};

const HypothesisItem = ({
  hypothesis: { candidate, confidence, status, reason, evidence = [] },
  variant,
}: {
  hypothesis: Hypothesis;
  variant: InvestigationAttachmentVariant;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationHypothesis' });
  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="investigationHypothesis"
      paddingSize="s"
      buttonProps={{ 'data-test-subj': 'investigationHypothesisToggle' }}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <HypothesisStatusIcon status={status} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText size="xs" color="text">
              <strong>{HYPOTHESIS_LABEL}</strong> <span>{candidate}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiBadge
          color={status === 'confirmed' ? 'success' : 'hollow'}
          title={confidenceLabel(confidence)}
          data-test-subj="investigationHypothesisConfidence"
        >
          {confidenceBadgeLabel(confidence)}
        </EuiBadge>
      }
    >
      <HypothesisDetail reason={reason} evidence={variant === 'details' ? evidence : []} />
    </EuiAccordion>
  );
};

/**
 * The hypotheses an investigation considered, in the order the agent reported them: one collapsed
 * row each with its status and confidence, expanding to its reason. The details flyout also shows
 * each hypothesis's evidence when expanded; the inline chat render leaves it out to stay compact.
 */
export const HypothesesList: React.FC<{
  hypotheses: Hypothesis[];
  variant: InvestigationAttachmentVariant;
}> = ({ hypotheses, variant }) => {
  if (hypotheses.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationHypothesesEmpty">
        {NO_HYPOTHESES}
      </EuiText>
    );
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationHypotheses">
      {hypotheses.map((hypothesis, index) => (
        <EuiFlexItem grow={false} key={index}>
          <HypothesisItem hypothesis={hypothesis} variant={variant} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const HypothesesView: React.FC<
  InvestigationAttachmentContentProps<InvestigationHypotheses>
> = ({ document: { hypotheses }, variant }) => (
  <HypothesesList hypotheses={hypotheses} variant={variant} />
);
