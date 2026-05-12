/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getVerdictColor } from '@kbn/streams-plugin/common';
import type {
  SigEventDocType,
  LifecycleDiscovery,
  LifecycleVerdict,
  LifecycleEvidence,
  LifecycleDetection,
} from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../hooks/use_kibana';
import { TRANSLATIONS } from './translations';
import { useRawDocument } from './use_raw_document';

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

// TODO: Replace with an agent_builder locator that accepts conversationId once available
const AGENT_BUILDER_CONVERSATION_PATH = '/app/agent_builder/conversations/';

// ---------------------------------------------------------------------------
// Reusable small components
// ---------------------------------------------------------------------------

const ConversationLink = React.memo(({ conversationId }: { conversationId: string }) => {
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();

  const href = basePath.prepend(`${AGENT_BUILDER_CONVERSATION_PATH}${conversationId}`);

  return (
    <EuiLink href={href} target="_blank" external>
      {TRANSLATIONS.lifecycle.viewConversation}
    </EuiLink>
  );
});

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

const CountedAccordion = ({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: ReactNode;
}) => (
  <EuiAccordion
    id={id}
    buttonContent={`${label} (${count})`}
    paddingSize="xs"
    css={compactAccordionCss}
  >
    {children}
  </EuiAccordion>
);

// ---------------------------------------------------------------------------
// Raw document accordion (lazy-fetches full _source on expand)
// ---------------------------------------------------------------------------

const RawDocAccordion = ({ type, docId }: { type: SigEventDocType; docId: string }) => {
  const { value, loading, fetch: fetchDoc } = useRawDocument({ type, docId });

  return (
    <EuiAccordion
      id={`raw-${type}-${docId}`}
      buttonContent={TRANSLATIONS.lifecycle.rawDocument}
      onToggle={fetchDoc}
      paddingSize="xs"
      css={compactAccordionCss}
    >
      {loading ? (
        <EuiLoadingSpinner size="s" />
      ) : value?._source ? (
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable overflowHeight={300}>
          {JSON.stringify(value._source, null, 2)}
        </EuiCodeBlock>
      ) : null}
    </EuiAccordion>
  );
};

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
        {formatTimestamp(detection.timestamp)}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{TRANSLATIONS.lifecycle.detectionStep}</strong>: {detection.rule_name}
          </EuiText>
        </EuiFlexItem>
        {detection.superseded && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">{TRANSLATIONS.lifecycle.superseded}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        {detection.stream_name && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{detection.stream_name}</EuiBadge>
          </EuiFlexItem>
        )}
        {detection.alert_count > 0 && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {detection.alert_count} {TRANSLATIONS.lifecycle.eventsDetected}
            </EuiText>
          </EuiFlexItem>
        )}
        {detection.change_point_type && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">{detection.change_point_type}</EuiBadge>
          </EuiFlexItem>
        )}
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
      <RawDocAccordion type="detection" docId={detection.id} />
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
          <CountedAccordion
            id={`discovery-evidences-${discovery.id}`}
            label={TRANSLATIONS.lifecycle.evidences}
            count={discovery.evidences.length}
          >
            <EvidencesList evidences={discovery.evidences} />
          </CountedAccordion>
        )}

        {discovery.dependency_edges.length > 0 && (
          <CountedAccordion
            id={`discovery-deps-${discovery.id}`}
            label={TRANSLATIONS.lifecycle.dependencies}
            count={discovery.dependency_edges.length}
          >
            <EuiDescriptionList compressed type="column" listItems={dependencyListItems} />
          </CountedAccordion>
        )}

        {discovery.infra_components.length > 0 && (
          <CountedAccordion
            id={`discovery-infra-${discovery.id}`}
            label={TRANSLATIONS.lifecycle.infraComponents}
            count={discovery.infra_components.length}
          >
            <EuiDescriptionList compressed type="column" listItems={infraListItems} />
          </CountedAccordion>
        )}

        {discovery.cause_kis.length > 0 && (
          <CountedAccordion
            id={`discovery-kis-${discovery.id}`}
            label={TRANSLATIONS.lifecycle.causeKis}
            count={discovery.cause_kis.length}
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
          </CountedAccordion>
        )}

        <RawDocAccordion type="discovery" docId={discovery.id} />
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
          <EuiText size="s">
            <strong>{TRANSLATIONS.lifecycle.verdictStep}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={getVerdictColor(v.verdict)}>{v.verdict}</EuiBadge>
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
        <CountedAccordion
          id={`verdict-recs-${v.id}`}
          label={TRANSLATIONS.lifecycle.recommendations}
          count={v.recommendations.length}
        >
          <EuiText size="xs">
            <ul>
              {v.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </EuiText>
        </CountedAccordion>
      )}

      {v.evidences.length > 0 && (
        <CountedAccordion
          id={`verdict-evidences-${v.id}`}
          label={TRANSLATIONS.lifecycle.evidences}
          count={v.evidences.length}
        >
          <EvidencesList evidences={v.evidences} />
        </CountedAccordion>
      )}

      <RawDocAccordion type="verdict" docId={v.id} />
    </EuiPanel>
  </EuiTimelineItem>
));

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TimelineEntry {
  timestamp: number;
  key: string;
  node: ReactNode;
}

interface LifecycleTimelineProps {
  detections: LifecycleDetection[];
  discoveries: LifecycleDiscovery[];
  verdicts: LifecycleVerdict[];
  eventId: string;
  eventTimestamp: string;
}

export const LifecycleTimeline = React.memo(
  ({ detections, discoveries, verdicts, eventId, eventTimestamp }: LifecycleTimelineProps) => {
    const sortedItems = useMemo(() => {
      const entries: TimelineEntry[] = [];

      for (const detection of detections) {
        entries.push({
          timestamp: new Date(detection.timestamp).getTime(),
          key: `detection-${detection.detection_id}`,
          node: <DetectionItem detection={detection} />,
        });
      }

      for (const discovery of discoveries) {
        entries.push({
          timestamp: new Date(discovery.timestamp).getTime(),
          key: `discovery-${discovery.id}`,
          node: <DiscoveryItem discovery={discovery} />,
        });
      }

      for (const v of verdicts) {
        entries.push({
          timestamp: new Date(v.timestamp).getTime(),
          key: `verdict-${v.id}`,
          node: <VerdictItem verdict={v} />,
        });
      }

      entries.push({
        timestamp: new Date(eventTimestamp).getTime(),
        key: 'event-created',
        node: (
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
              <RawDocAccordion type="event" docId={eventId} />
            </EuiPanel>
          </EuiTimelineItem>
        ),
      });

      entries.sort((a, b) => a.timestamp - b.timestamp);
      return entries;
    }, [detections, discoveries, verdicts, eventId, eventTimestamp]);

    return (
      <EuiTimeline>
        {sortedItems.map((entry) => (
          <React.Fragment key={entry.key}>{entry.node}</React.Fragment>
        ))}
      </EuiTimeline>
    );
  }
);
