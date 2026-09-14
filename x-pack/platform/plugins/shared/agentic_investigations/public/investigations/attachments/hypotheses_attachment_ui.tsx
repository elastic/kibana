/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  ConversationDetailsRenderProps,
} from '@kbn/agent-builder-browser';

type HypothesisStatus = 'investigating' | 'confirmed' | 'dismissed';

/** Data shape of one hypothesis inside the hypotheses attachment. */
interface InvestigationHypothesis {
  candidate: string;
  confidence: number;
  status: HypothesisStatus;
  reason?: string;
  evidence?: Array<{ description: string }>;
}

/** Data shape of the investigations.hypotheses attachment. */
interface HypothesesAttachmentData {
  hypotheses: InvestigationHypothesis[];
}

interface HypothesesAttachment {
  id: string;
  type: string;
  data: HypothesesAttachmentData;
}

const STATUS_BADGE_COLOR: Record<HypothesisStatus, string> = {
  confirmed: 'success',
  dismissed: 'default',
  investigating: 'primary',
};

const STATUS_LABEL: Record<HypothesisStatus, string> = {
  confirmed: i18n.translate('xpack.agenticInvestigations.attachments.hypotheses.status.confirmed', {
    defaultMessage: 'Confirmed',
  }),
  dismissed: i18n.translate('xpack.agenticInvestigations.attachments.hypotheses.status.dismissed', {
    defaultMessage: 'Dismissed',
  }),
  investigating: i18n.translate(
    'xpack.agenticInvestigations.attachments.hypotheses.status.investigating',
    { defaultMessage: 'Investigating' }
  ),
};

const renderInlineContent = ({ attachment }: { attachment: HypothesesAttachment }) => {
  const hypotheses: InvestigationHypothesis[] = attachment.data?.hypotheses ?? [];
  const confirmedCount = hypotheses.filter((h) => h.status === 'confirmed').length;

  return (
    <EuiText size="s">
      {confirmedCount > 0
        ? i18n.translate(
            'xpack.agenticInvestigations.attachments.hypotheses.summaryWithConfirmed',
            {
              defaultMessage:
                '{total} {total, plural, one {hypothesis} other {hypotheses}} ({confirmed} confirmed)',
              values: { total: hypotheses.length, confirmed: confirmedCount },
            }
          )
        : i18n.translate('xpack.agenticInvestigations.attachments.hypotheses.summary', {
            defaultMessage: '{total} {total, plural, one {hypothesis} other {hypotheses}}',
            values: { total: hypotheses.length },
          })}
    </EuiText>
  );
};

const HypothesisItem = ({ hypothesis }: { hypothesis: InvestigationHypothesis }) => {
  const confidencePct = Math.round(hypothesis.confidence * 100);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={STATUS_BADGE_COLOR[hypothesis.status]}>
              {STATUS_LABEL[hypothesis.status]}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.agenticInvestigations.attachments.hypotheses.confidence', {
                defaultMessage: '{pct}% confidence',
                values: { pct: confidencePct },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <p>{hypothesis.candidate}</p>
        </EuiText>
      </EuiFlexItem>
      {hypothesis.reason && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <p>{hypothesis.reason}</p>
          </EuiText>
        </EuiFlexItem>
      )}
      {hypothesis.evidence && hypothesis.evidence.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <ul>
              {hypothesis.evidence.map((ev, idx) => (
                <li key={idx}>{ev.description}</li>
              ))}
            </ul>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const renderConversationDetailsContent = ({
  attachment,
}: ConversationDetailsRenderProps<HypothesesAttachment>) => {
  const hypotheses: InvestigationHypothesis[] = attachment.data?.hypotheses ?? [];

  if (!hypotheses.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.attachments.hypotheses.noHypotheses', {
          defaultMessage: 'No hypotheses recorded.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.agenticInvestigations.attachments.hypotheses.detailsTitle', {
              defaultMessage: 'Hypotheses',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {hypotheses.map((hypothesis, idx) => (
        <React.Fragment key={idx}>
          <EuiFlexItem grow={false}>
            <HypothesisItem hypothesis={hypothesis} />
          </EuiFlexItem>
          {idx < hypotheses.length - 1 && (
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
            </EuiFlexItem>
          )}
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
};

export const hypothesesAttachmentUIDefinition: AttachmentUIDefinition<HypothesesAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.agenticInvestigations.attachments.hypotheses.label', {
      defaultMessage: 'Hypotheses',
    }),
  getIcon: () => 'search',
  renderInlineContent,
  renderConversationDetailsContent,
};
