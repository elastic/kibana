/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ConversationTemplateServiceStartContract,
  ConversationTemplateDetailsFlyoutRenderProps,
} from '@kbn/agent-builder-browser';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';

const INVESTIGATION_TEMPLATE_ID = 'investigation';
const INVESTIGATION_IMPACT_TAB_ID = 'investigations.impact_tab';
const INVESTIGATION_HYPOTHESES_TAB_ID = 'investigations.hypotheses_tab';
const INVESTIGATION_RECOMMENDATIONS_TAB_ID = 'investigations.recommendations_tab';
const INVESTIGATION_BLIND_SPOTS_TAB_ID = 'investigations.blind_spots_tab';

const severityBadgeColor = (severity: string | undefined): string => {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

const statusBadgeColor = (status: string | undefined): string => {
  switch (status) {
    case 'completed':
    case 'closed':
      return 'success';
    case 'running':
    case 'open':
      return 'primary';
    case 'failed':
      return 'danger';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
};

const hypothesisStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'dismissed':
      return 'default';
    default:
      return 'primary';
  }
};

const confidenceLabel = (confidence: number): string => `${Math.round(confidence * 100)}%`;

// ── Header ────────────────────────────────────────────────────────────────────

const InvestigationDetailsHeader = ({
  conversation,
}: ConversationTemplateDetailsFlyoutRenderProps) => {
  const metadata = conversation.metadata ?? {};
  const severity = typeof metadata['severity'] === 'string' ? metadata['severity'] : undefined;
  const status = typeof metadata['status'] === 'string' ? metadata['status'] : undefined;
  const summary = typeof metadata['summary'] === 'string' ? metadata['summary'] : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>
            {conversation.title ||
              i18n.translate('xpack.agenticInvestigations.templateUI.header.defaultTitle', {
                defaultMessage: 'Investigation',
              })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {severity && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={severityBadgeColor(severity)}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {status && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={statusBadgeColor(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {summary && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>{summary}</p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

// ── Impact tab ────────────────────────────────────────────────────────────────

const ImpactTabContent = ({ conversation }: ConversationTemplateDetailsFlyoutRenderProps) => {
  const impactAttachment = conversation.attachments?.find(
    (att) => att.type === INVESTIGATION_ATTACHMENT_IDS.IMPACT
  );

  if (!impactAttachment) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.impactTab.noData', {
          defaultMessage: 'No impact data available for this investigation.',
        })}
      </EuiText>
    );
  }

  const currentVersionData = impactAttachment.versions.find(
    (v) => v.version === impactAttachment.current_version
  )?.data as { entities?: Array<{ name: string; type?: string }> } | undefined;

  const entities = currentVersionData?.entities ?? [];

  if (!entities.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.impactTab.noEntities', {
          defaultMessage: 'No impacted entities identified.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {entities.map((entity) => (
        <EuiFlexItem key={entity.name} grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{entity.name}</EuiBadge>
            </EuiFlexItem>
            {entity.type && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {entity.type}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

// ── Hypotheses tab ────────────────────────────────────────────────────────────

interface Hypothesis {
  candidate: string;
  confidence: number;
  status: 'investigating' | 'dismissed' | 'confirmed';
  reason?: string;
}

const HypothesesTabContent = ({ conversation }: ConversationTemplateDetailsFlyoutRenderProps) => {
  const attachment = conversation.attachments?.find(
    (att) => att.type === INVESTIGATION_ATTACHMENT_IDS.HYPOTHESES
  );

  if (!attachment) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.hypothesesTab.noData', {
          defaultMessage: 'No hypotheses recorded for this investigation.',
        })}
      </EuiText>
    );
  }

  const data = attachment.versions.find((v) => v.version === attachment.current_version)
    ?.data as { hypotheses?: Hypothesis[] } | undefined;
  const hypotheses = data?.hypotheses ?? [];

  if (!hypotheses.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.hypothesesTab.empty', {
          defaultMessage: 'No hypotheses evaluated yet.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {hypotheses.map((h, idx) => (
        <EuiFlexItem key={idx} grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow>
                  <EuiText size="s">
                    <strong>{h.candidate}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={hypothesisStatusColor(h.status)}>
                    {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {confidenceLabel(h.confidence)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {h.reason && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <p>{h.reason}</p>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {idx < hypotheses.length - 1 && <EuiHorizontalRule margin="s" />}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

// ── Recommendations tab ───────────────────────────────────────────────────────

interface Recommendation {
  title: string;
  confidence: number;
  description?: string;
  code?: string;
}

const RecommendationsTabContent = ({
  conversation,
}: ConversationTemplateDetailsFlyoutRenderProps) => {
  const attachment = conversation.attachments?.find(
    (att) => att.type === INVESTIGATION_ATTACHMENT_IDS.RECOMMENDATIONS
  );

  if (!attachment) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.recommendationsTab.noData', {
          defaultMessage: 'No recommendations recorded for this investigation.',
        })}
      </EuiText>
    );
  }

  const data = attachment.versions.find((v) => v.version === attachment.current_version)
    ?.data as { recommendations?: Recommendation[] } | undefined;
  const recommendations = data?.recommendations ?? [];

  if (!recommendations.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.recommendationsTab.empty', {
          defaultMessage: 'No recommendations yet.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {recommendations.map((rec, idx) => (
        <EuiFlexItem key={idx} grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow>
                  <EuiText size="s">
                    <strong>{rec.title}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {confidenceLabel(rec.confidence)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {rec.description && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <p>{rec.description}</p>
                </EuiText>
              </EuiFlexItem>
            )}
            {rec.code && (
              <EuiFlexItem grow={false}>
                <EuiSpacer size="xs" />
                <EuiText size="xs">
                  <pre
                    style={{
                      background: 'rgba(0,0,0,0.05)',
                      padding: '8px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '11px',
                    }}
                  >
                    {rec.code}
                  </pre>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {idx < recommendations.length - 1 && <EuiHorizontalRule margin="s" />}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

// ── Blind spots tab ───────────────────────────────────────────────────────────

interface BlindSpot {
  title: string;
  confidence: number;
  description: string;
}

const BlindSpotsTabContent = ({ conversation }: ConversationTemplateDetailsFlyoutRenderProps) => {
  const attachment = conversation.attachments?.find(
    (att) => att.type === INVESTIGATION_ATTACHMENT_IDS.BLIND_SPOTS
  );

  if (!attachment) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.blindSpotsTab.noData', {
          defaultMessage: 'No blind spots recorded for this investigation.',
        })}
      </EuiText>
    );
  }

  const data = attachment.versions.find((v) => v.version === attachment.current_version)
    ?.data as { blind_spots?: BlindSpot[] } | undefined;
  const blindSpots = data?.blind_spots ?? [];

  if (!blindSpots.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.templateUI.blindSpotsTab.empty', {
          defaultMessage: 'No blind spots identified.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {blindSpots.map((bs, idx) => (
        <EuiFlexItem key={idx} grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow>
                  <EuiText size="s">
                    <strong>{bs.title}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {confidenceLabel(bs.confidence)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <p>{bs.description}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {idx < blindSpots.length - 1 && <EuiHorizontalRule margin="s" />}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

// ── Registration ──────────────────────────────────────────────────────────────

export const registerInvestigationTemplateUI = (
  conversationTemplates: ConversationTemplateServiceStartContract
): void => {
  conversationTemplates.registerTab(INVESTIGATION_IMPACT_TAB_ID, () => ({
    label: i18n.translate('xpack.agenticInvestigations.templateUI.impactTab.label', {
      defaultMessage: 'Impact',
    }),
    content: ImpactTabContent,
  }));

  conversationTemplates.registerTab(INVESTIGATION_HYPOTHESES_TAB_ID, () => ({
    label: i18n.translate('xpack.agenticInvestigations.templateUI.hypothesesTab.label', {
      defaultMessage: 'Hypotheses',
    }),
    content: HypothesesTabContent,
  }));

  conversationTemplates.registerTab(INVESTIGATION_RECOMMENDATIONS_TAB_ID, () => ({
    label: i18n.translate('xpack.agenticInvestigations.templateUI.recommendationsTab.label', {
      defaultMessage: 'Recommendations',
    }),
    content: RecommendationsTabContent,
  }));

  conversationTemplates.registerTab(INVESTIGATION_BLIND_SPOTS_TAB_ID, () => ({
    label: i18n.translate('xpack.agenticInvestigations.templateUI.blindSpotsTab.label', {
      defaultMessage: 'Blind Spots',
    }),
    content: BlindSpotsTabContent,
  }));

  conversationTemplates.registerTemplateUIDefinition(INVESTIGATION_TEMPLATE_ID, () => ({
    name: i18n.translate('xpack.agenticInvestigations.templateUI.templateName', {
      defaultMessage: 'Investigation',
    }),
    icon: 'inspect',
    tabs: [
      INVESTIGATION_IMPACT_TAB_ID,
      INVESTIGATION_HYPOTHESES_TAB_ID,
      INVESTIGATION_RECOMMENDATIONS_TAB_ID,
      INVESTIGATION_BLIND_SPOTS_TAB_ID,
    ],
    detailsFlyout: {
      header: InvestigationDetailsHeader,
    },
  }));
};
