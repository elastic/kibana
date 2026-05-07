/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiTimeline,
  EuiTimelineItem,
  EuiText,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiAccordion,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { VERDICT_COLORS } from '@kbn/streams-plugin/common';
import type {
  Verdict,
  LifecycleDiscovery,
  LifecycleVerdict,
  LifecycleEvidence,
  LifecycleDetection,
} from '@kbn/streams-plugin/common';
import { TRANSLATIONS } from './translations';

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const formatTimestamp = (ts: string): string => {
  const date = new Date(ts);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const formatPValue = (p: number): string => {
  if (p === 0) return '0 (extreme)';
  if (p < 0.001) return `${p.toExponential(2)}`;
  return p.toFixed(4);
};

const RESULT_COLORS: Record<string, string> = {
  found: 'success',
  empty: 'warning',
  error: 'danger',
};

const compactAccordionCss = css`
  .euiAccordion__button {
    font-size: 12px;
  }
`;

const AGENT_BUILDER_CONVERSATION_PATH = '/app/agent_builder/conversations/';

// ---------------------------------------------------------------------------
// Reusable small components
// ---------------------------------------------------------------------------

const ConversationLink = React.memo(({ conversationId }: { conversationId: string }) => (
  <EuiLink href={`${AGENT_BUILDER_CONVERSATION_PATH}${conversationId}`} target="_blank" external>
    {TRANSLATIONS.lifecycle.viewConversation}
  </EuiLink>
));

const EvidencesList = React.memo(({ evidences }: { evidences: LifecycleEvidence[] }) => {
  if (!evidences.length) return null;
  return (
    <>
      {evidences.map((ev, idx) => (
        <EuiPanel key={idx} paddingSize="xs" color="transparent" hasBorder={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color={RESULT_COLORS[ev.result] ?? 'default'}>{ev.result}</EuiBadge>
            </EuiFlexItem>
            {ev.rule_name && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{ev.rule_name}</strong>
                </EuiText>
              </EuiFlexItem>
            )}
            {ev.stream_name && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{ev.stream_name}</EuiBadge>
              </EuiFlexItem>
            )}
            {ev.row_count > 0 && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.streams.lifecycle.rowCount', {
                    defaultMessage: '{count} rows',
                    values: { count: ev.row_count },
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
            {ev.confirmed && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="success" iconType="check">
                  {TRANSLATIONS.lifecycle.confirmed}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {ev.description && (
            <EuiText size="xs" color="subdued">
              {ev.description}
            </EuiText>
          )}
          {ev.esql_query && (
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
              {ev.esql_query}
            </EuiCodeBlock>
          )}
        </EuiPanel>
      ))}
    </>
  );
});

// ---------------------------------------------------------------------------
// Detection timeline item
// ---------------------------------------------------------------------------

const DetectionItem = React.memo(({ detection }: { detection: LifecycleDetection }) => (
  <EuiTimelineItem
    icon="bell"
    iconAriaLabel={TRANSLATIONS.lifecycle.detectionStep}
    verticalAlign="top"
  >
    <EuiPanel paddingSize="s" color="plain" hasBorder>
      <EuiText size="xs" color="subdued">
        {formatTimestamp(detection.detected_at)}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{detection.rule_name}</strong>
          </EuiText>
        </EuiFlexItem>
        {detection.superseded && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">{TRANSLATIONS.lifecycle.resolved}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{detection.stream_name}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {detection.event_count} {TRANSLATIONS.lifecycle.eventsDetected}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">{detection.change_point_type}</EuiBadge>
        </EuiFlexItem>
        {detection.p_value != null && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={TRANSLATIONS.lifecycle.pValueTooltip}>
              <EuiBadge tabIndex={0} color={detection.p_value === 0 ? 'danger' : 'hollow'}>
                {i18n.translate('xpack.streams.lifecycle.pValue', {
                  defaultMessage: 'p={value}',
                  values: { value: formatPValue(detection.p_value) },
                })}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  </EuiTimelineItem>
));

// ---------------------------------------------------------------------------
// Discovery timeline item
// ---------------------------------------------------------------------------

const DiscoveryItem = React.memo(({ discovery }: { discovery: LifecycleDiscovery }) => {
  const dependencyListItems = useMemo(
    () =>
      discovery.dependency_edges.map((edge) => {
        const exposed = edge.exposure === 'exposed' ? TRANSLATIONS.lifecycle.exposed : '';
        return {
          title: `${edge.source} → ${edge.target}`,
          description: `${edge.protocol ?? ''} ${exposed}`.trim() || '—',
        };
      }),
    [discovery.dependency_edges]
  );

  const infraListItems = useMemo(
    () =>
      discovery.infra_components.map((comp) => {
        const exposed = comp.exposure === 'exposed' ? TRANSLATIONS.lifecycle.exposed : '';
        return {
          title: comp.title ?? 'Unknown',
          description: `${(comp.workloads ?? []).join(', ')} ${exposed}`.trim() || '—',
        };
      }),
    [discovery.infra_components]
  );

  return (
    <EuiTimelineItem
      icon="inspect"
      iconAriaLabel={TRANSLATIONS.lifecycle.discoveryStep}
      verticalAlign="top"
    >
      <EuiPanel paddingSize="s" color="plain" hasBorder>
        <EuiText size="xs" color="subdued">
          {formatTimestamp(discovery.timestamp)}
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{TRANSLATIONS.lifecycle.discoveryStep}</strong>: {discovery.title}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={discovery.kind === 'clearance' ? 'success' : 'primary'}>
              {discovery.kind}
            </EuiBadge>
          </EuiFlexItem>
          {discovery.change_point_occurrence && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={discovery.change_point_occurrence === 'recurring' ? 'warning' : 'hollow'}
              >
                {discovery.change_point_occurrence}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          {discovery.confidence != null && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                {TRANSLATIONS.lifecycle.confidence}: {discovery.confidence}%
              </EuiText>
            </EuiFlexItem>
          )}
          {discovery.criticality != null && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                {TRANSLATIONS.lifecycle.criticality}: {discovery.criticality}
              </EuiText>
            </EuiFlexItem>
          )}
          {discovery.impact && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{discovery.impact}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {discovery.conversation_id && (
          <>
            <EuiSpacer size="xs" />
            <ConversationLink conversationId={discovery.conversation_id} />
          </>
        )}

        <EuiSpacer size="s" />
        <EuiAccordion
          id={`discovery-detail-${discovery.id}`}
          buttonContent={TRANSLATIONS.lifecycle.rootCause}
          paddingSize="xs"
          css={compactAccordionCss}
        >
          <EuiText size="xs">{discovery.root_cause || TRANSLATIONS.lifecycle.noData}</EuiText>
        </EuiAccordion>

        {discovery.evidences.length > 0 && (
          <EuiAccordion
            id={`discovery-evidences-${discovery.id}`}
            buttonContent={`${TRANSLATIONS.lifecycle.evidences} (${discovery.evidences.length})`}
            paddingSize="xs"
            css={compactAccordionCss}
          >
            <EvidencesList evidences={discovery.evidences} />
          </EuiAccordion>
        )}

        {discovery.dependency_edges.length > 0 && (
          <EuiAccordion
            id={`discovery-deps-${discovery.id}`}
            buttonContent={`${TRANSLATIONS.lifecycle.dependencies} (${discovery.dependency_edges.length})`}
            paddingSize="xs"
            css={compactAccordionCss}
          >
            <EuiDescriptionList compressed type="column" listItems={dependencyListItems} />
          </EuiAccordion>
        )}

        {discovery.infra_components.length > 0 && (
          <EuiAccordion
            id={`discovery-infra-${discovery.id}`}
            buttonContent={`${TRANSLATIONS.lifecycle.infraComponents} (${discovery.infra_components.length})`}
            paddingSize="xs"
            css={compactAccordionCss}
          >
            <EuiDescriptionList compressed type="column" listItems={infraListItems} />
          </EuiAccordion>
        )}

        {discovery.cause_kis.length > 0 && (
          <EuiAccordion
            id={`discovery-kis-${discovery.id}`}
            buttonContent={`${TRANSLATIONS.lifecycle.causeKis} (${discovery.cause_kis.length})`}
            paddingSize="xs"
            css={compactAccordionCss}
          >
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {discovery.cause_kis.map((ki, idx) => (
                <EuiFlexItem grow={false} key={idx}>
                  <EuiBadge color="hollow">
                    {ki.name} ({ki.stream_name})
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiAccordion>
        )}
      </EuiPanel>
    </EuiTimelineItem>
  );
});

// ---------------------------------------------------------------------------
// Verdict timeline item
// ---------------------------------------------------------------------------

const VerdictItem = React.memo(({ verdict: v }: { verdict: LifecycleVerdict }) => (
  <EuiTimelineItem
    icon="check"
    iconAriaLabel={TRANSLATIONS.lifecycle.verdictStep}
    verticalAlign="top"
  >
    <EuiPanel paddingSize="s" color="plain" hasBorder>
      <EuiText size="xs" color="subdued">
        {formatTimestamp(v.timestamp)}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <strong>{TRANSLATIONS.lifecycle.verdictStep}</strong>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={VERDICT_COLORS[v.verdict as Verdict] ?? 'default'}>{v.verdict}</EuiBadge>
        </EuiFlexItem>
        {v.original_verdict && v.original_verdict !== v.verdict && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.lifecycle.originalVerdict', {
                defaultMessage: '(was: {original})',
                values: { original: v.original_verdict },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
        {v.confidence != null && v.confidence > 0 && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              {TRANSLATIONS.lifecycle.confidence}: {v.confidence}%
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {v.verdict_summary && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{v.verdict_summary}</EuiText>
        </>
      )}

      {v.conversation_id && (
        <>
          <EuiSpacer size="xs" />
          <ConversationLink conversationId={v.conversation_id} />
        </>
      )}

      <EuiSpacer size="xs" />

      {v.assessment_note && (
        <EuiAccordion
          id={`verdict-assessment-${v.id}`}
          buttonContent={TRANSLATIONS.lifecycle.assessmentNote}
          paddingSize="xs"
          css={compactAccordionCss}
        >
          <EuiText size="xs">{v.assessment_note}</EuiText>
        </EuiAccordion>
      )}

      {v.recommendations.length > 0 && (
        <EuiAccordion
          id={`verdict-recs-${v.id}`}
          buttonContent={`${TRANSLATIONS.lifecycle.recommendations} (${v.recommendations.length})`}
          paddingSize="xs"
          css={compactAccordionCss}
        >
          <EuiText size="xs">
            <ul>
              {v.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </EuiText>
        </EuiAccordion>
      )}

      {v.evidences.length > 0 && (
        <EuiAccordion
          id={`verdict-evidences-${v.id}`}
          buttonContent={`${TRANSLATIONS.lifecycle.evidences} (${v.evidences.length})`}
          paddingSize="xs"
          css={compactAccordionCss}
        >
          <EvidencesList evidences={v.evidences} />
        </EuiAccordion>
      )}
    </EuiPanel>
  </EuiTimelineItem>
));

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LifecycleTimelineProps {
  discovery: LifecycleDiscovery | null;
  verdicts: LifecycleVerdict[];
  eventTimestamp: string;
}

export const LifecycleTimeline = React.memo(
  ({ discovery, verdicts, eventTimestamp }: LifecycleTimelineProps) => (
    <EuiTimeline>
      {discovery?.detections.map((detection) => (
        <DetectionItem key={detection.detection_id} detection={detection} />
      ))}

      {discovery && <DiscoveryItem discovery={discovery} />}

      {verdicts.map((v) => (
        <VerdictItem key={v.id} verdict={v} />
      ))}

      <EuiTimelineItem
        icon="document"
        iconAriaLabel={TRANSLATIONS.lifecycle.eventCreated}
        verticalAlign="top"
      >
        <EuiPanel paddingSize="s" color="plain" hasBorder>
          <EuiText size="xs" color="subdued">
            {formatTimestamp(eventTimestamp)}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <strong>{TRANSLATIONS.lifecycle.eventCreated}</strong>
          </EuiText>
        </EuiPanel>
      </EuiTimelineItem>
    </EuiTimeline>
  )
);
