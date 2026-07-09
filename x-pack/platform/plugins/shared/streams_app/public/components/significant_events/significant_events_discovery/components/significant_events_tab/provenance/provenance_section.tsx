/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiStepsProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type {
  Discovery,
  EventLifecycleResponse,
  LifecycleDetection,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { useKibana } from '../../../../../../hooks/use_kibana';
import type { StreamQueryStats } from '../../../../../../hooks/significant_events/use_fetch_query_occurrence_stats';
import { SeverityBadge } from '../../severity_badge/severity_badge';
import { getSignificantEventStatusColor } from '../../shared/status_display';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from '../../shared/translations';
import { FiredRuleCard } from './fired_rule_card';
import { useFetchEventWindowStats } from './use_fetch_event_window_stats';

const SECTION_TITLE = i18n.translate('xpack.streams.sigEventsTab.provenance.sectionTitle', {
  defaultMessage: 'How we got here',
});
const SECTION_SUBTITLE = i18n.translate('xpack.streams.sigEventsTab.provenance.sectionSubtitle', {
  defaultMessage:
    'The trail from learned knowledge indicators, through the rules that fired, to this significant event.',
});

/** Agent-written prose can run long — clamp it so cards stay scannable. */
const clampedTextCss = css`
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/**
 * Pads the window the provenance charts are rendered over: half the observed span on each
 * side (at least 30 minutes) so the change point sits in context rather than on the edge.
 */
const buildWindow = (
  event: SignificantEvent,
  detections: LifecycleDetection[]
): { from?: string; to?: string } => {
  const timestamps = [event['@timestamp'], ...detections.map((d) => d['@timestamp'])]
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) {
    return {};
  }

  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const pad = Math.max((max - min) / 2, 30 * 60 * 1000);

  return {
    from: new Date(min - pad).toISOString(),
    to: new Date(Math.min(max + pad, Date.now())).toISOString(),
  };
};

const KnowledgeIndicatorCard: React.FC<{ stats: StreamQueryStats }> = ({ stats }) => {
  const { euiTheme } = useEuiTheme();
  const { query, stream_name: streamName, rule_backed: ruleBacked } = stats;

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="provenanceKnowledgeIndicatorCard">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon type="tag" size="s" color={euiTheme.colors.textSubdued} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText size="s">
            <strong>{query.title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SeverityBadge score={query.severity_score} />
        </EuiFlexItem>
        {ruleBacked && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" iconType="bell">
              {i18n.translate('xpack.streams.sigEventsTab.provenance.ruleBackedBadge', {
                defaultMessage: 'Rule-backed',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{streamName}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      {query.description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" css={clampedTextCss} title={query.description}>
            {query.description}
          </EuiText>
        </>
      )}
      {(query.features?.length ?? 0) > 0 && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.sigEventsTab.provenance.builtOnFeatures', {
                  defaultMessage: 'Built on:',
                })}
              </EuiText>
            </EuiFlexItem>
            {query.features!.map((feature) => (
              <EuiFlexItem grow={false} key={feature.id}>
                <EuiBadge color="default">{feature.id}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};

const RationalePanel: React.FC<{
  icon: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasShadow={false}
      color="subdued"
      paddingSize="s"
      css={css`
        border-left: ${euiTheme.size.xxs} solid ${euiTheme.colors.primary};
        border-radius: 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0;
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>{title}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {children}
      </EuiText>
    </EuiPanel>
  );
};

export interface ProvenanceSectionProps {
  event: SignificantEvent;
  lifecycle?: EventLifecycleResponse;
  isLoading?: boolean;
}

/**
 * Tells the story of how this significant event came to be, as a stepped narrative grounded
 * in the actual pipeline artifacts: the knowledge indicators the fired rules were generated
 * from, the change points detected in those rules' alert patterns (charted around the moment
 * of detection), the discovery that correlated them (with the agent's rationale and evidence,
 * linked to Discover), and the triage verdict that promoted it.
 */
export const ProvenanceSection: React.FC<ProvenanceSectionProps> = ({
  event,
  lifecycle,
  isLoading,
}) => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  /**
   * The full story is one click away: collapsed, the section is a single line summarising the
   * chain, and the occurrence-series fetch is deferred until someone actually opens it.
   */
  const [isOpen, setIsOpen] = useState(false);
  const accordionId = useGeneratedHtmlId({ prefix: 'provenanceSection' });

  const detections = useMemo(() => {
    // One card per rule — keep the earliest detection (the moment the story started), but
    // prefer a `detection` over a `quiet` (recovery) record when the rule has both.
    const byRule = new Map<string, LifecycleDetection>();
    for (const detection of [...(lifecycle?.detections ?? [])].sort(
      (a, b) => Date.parse(a['@timestamp']) - Date.parse(b['@timestamp'])
    )) {
      const key = detection.rule_name ?? detection.detection_id;
      const existing = byRule.get(key);
      if (!existing || (existing.kind === 'quiet' && detection.kind === 'detection')) {
        byRule.set(key, detection);
      }
    }
    return Array.from(byRule.values());
  }, [lifecycle?.detections]);

  const discovery: Discovery | undefined = useMemo(
    () => [...(lifecycle?.discoveries ?? [])].reverse().find(({ kind }) => kind === 'discovery'),
    [lifecycle?.discoveries]
  );

  const evidenceByRule = useMemo(
    () =>
      new Map(
        (discovery?.detections ?? [])
          .filter(({ rule_name: ruleName }) => ruleName != null)
          .map((detection) => [detection.rule_name as string, detection])
      ),
    [discovery?.detections]
  );

  const window = useMemo(() => buildWindow(event, detections), [event, detections]);

  const { data: stats, isLoading: isStatsLoading } = useFetchEventWindowStats({
    streamNames: event.stream_names ?? [],
    from: window.from,
    to: window.to,
    enabled: isOpen,
  });

  const statsByRuleName = useMemo(
    () => new Map((stats ?? []).map((entry) => [entry.query.title, entry])),
    [stats]
  );

  const getEsqlHref = useCallback(
    (esql: string): string | undefined => {
      const discoverLocator =
        share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
      if (!discoverLocator || !window.from || !window.to) return undefined;
      return discoverLocator.getRedirectUrl({
        query: { esql },
        timeRange: { from: window.from, to: window.to },
      });
    },
    [share.url.locators, window.from, window.to]
  );

  const matchedKis = detections
    .map(({ rule_name: ruleName }) => (ruleName ? statsByRuleName.get(ruleName) : undefined))
    .filter((entry): entry is StreamQueryStats => entry != null);

  const causeKis = event.cause_kis ?? [];

  const steps: EuiStepsProps['steps'] = [
    {
      title: i18n.translate('xpack.streams.sigEventsTab.provenance.kisStepTitle', {
        defaultMessage: 'Knowledge indicators behind the rules',
      }),
      children: (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.sigEventsTab.provenance.kisStepDescription', {
              defaultMessage:
                'The rules that fired were generated from these knowledge indicators — signals learned about the monitored systems.',
            })}
          </EuiText>
          {isStatsLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : matchedKis.length > 0 ? (
            matchedKis.map((entry) => <KnowledgeIndicatorCard key={entry.query.id} stats={entry} />)
          ) : (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.sigEventsTab.provenance.noKisMatched', {
                defaultMessage:
                  'The knowledge indicators backing the fired rules are no longer available.',
              })}
            </EuiText>
          )}
          {causeKis.length > 0 && (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.streams.sigEventsTab.provenance.causeKisLabel', {
                    defaultMessage: 'Identified as causal:',
                  })}
                </EuiText>
              </EuiFlexItem>
              {causeKis.map((ki, index) => (
                <EuiFlexItem grow={false} key={`${ki.name}-${index}`}>
                  <EuiBadge color="default" iconType="tag">
                    {ki.name ?? '-'}
                    {ki.stream_name ? ` (${ki.stream_name})` : ''}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate('xpack.streams.sigEventsTab.provenance.rulesStepTitle', {
        defaultMessage: 'Rules fired and change points detected',
      }),
      children: (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.sigEventsTab.provenance.rulesStepDescription', {
              defaultMessage:
                'A statistically significant change in each rule’s alert pattern is what set this event in motion.',
            })}
          </EuiText>
          {detections.length > 0 ? (
            detections.map((detection) => {
              const evidence = detection.rule_name
                ? evidenceByRule.get(detection.rule_name)
                : undefined;
              return (
                <FiredRuleCard
                  key={detection.detection_id}
                  detection={detection}
                  pValue={evidence?.p_value}
                  alertCount={evidence?.alert_count}
                  stats={detection.rule_name ? statsByRuleName.get(detection.rule_name) : undefined}
                />
              );
            })
          ) : (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.sigEventsTab.provenance.noDetections', {
                defaultMessage: 'No detection records could be reconstructed for this event.',
              })}
            </EuiText>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate('xpack.streams.sigEventsTab.provenance.discoveryStepTitle', {
        defaultMessage: 'Correlated into a discovery',
      }),
      children: discovery ? (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiText size="s">
            <strong>{discovery.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {discovery.summary}
          </EuiText>
          {discovery.grouping_rationale && (
            <RationalePanel
              icon="branch"
              title={i18n.translate('xpack.streams.sigEventsTab.provenance.groupingRationale', {
                defaultMessage: 'Why these signals were grouped',
              })}
            >
              {discovery.grouping_rationale}
            </RationalePanel>
          )}
          {discovery.impact && (
            <RationalePanel
              icon="users"
              title={i18n.translate('xpack.streams.sigEventsTab.provenance.impact', {
                defaultMessage: 'Assessed impact',
              })}
            >
              {discovery.impact}
            </RationalePanel>
          )}
          {(discovery.evidences?.length ?? 0) > 0 && (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiText size="xs">
                <strong>
                  {i18n.translate('xpack.streams.sigEventsTab.provenance.evidenceCollected', {
                    defaultMessage: 'Evidence collected',
                  })}
                </strong>
              </EuiText>
              {discovery.evidences!.map((evidence, index) => (
                <EuiPanel key={index} hasBorder paddingSize="s">
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={evidence.confirmed ? 'checkInCircleFilled' : 'dot'}
                        size="s"
                        color={evidence.confirmed ? 'success' : 'subdued'}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <EuiText
                        size="xs"
                        css={clampedTextCss}
                        title={evidence.description ?? undefined}
                      >
                        {evidence.description ?? evidence.result ?? '-'}
                      </EuiText>
                    </EuiFlexItem>
                    {evidence.row_count != null && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">
                          {i18n.translate('xpack.streams.sigEventsTab.provenance.rowCount', {
                            defaultMessage: '{count, plural, one {# row} other {# rows}}',
                            values: { count: evidence.row_count },
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    {evidence.esql_query &&
                      (() => {
                        const href = getEsqlHref(evidence.esql_query);
                        return href ? (
                          <EuiFlexItem grow={false}>
                            <EuiBadge
                              color="hollow"
                              iconType="discoverApp"
                              href={href}
                              target="_blank"
                              data-test-subj="provenanceEvidenceDiscoverLink"
                            >
                              {i18n.translate(
                                'xpack.streams.sigEventsTab.provenance.openInDiscover',
                                { defaultMessage: 'Open in Discover' }
                              )}
                            </EuiBadge>
                          </EuiFlexItem>
                        ) : null;
                      })()}
                  </EuiFlexGroup>
                </EuiPanel>
              ))}
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      ) : (
        <EuiText size="xs" color="subdued">
          {isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            i18n.translate('xpack.streams.sigEventsTab.provenance.noDiscovery', {
              defaultMessage: 'No discovery record could be reconstructed for this event.',
            })
          )}
        </EuiText>
      ),
    },
    {
      title: i18n.translate('xpack.streams.sigEventsTab.provenance.triageStepTitle', {
        defaultMessage: 'Judged significant',
      }),
      children: (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color={getSignificantEventStatusColor(event.status)}>
                {SIGNIFICANT_EVENT_STATUS_LABELS[event.status]}
              </EuiBadge>
            </EuiFlexItem>
            {event.criticality != null && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.streams.sigEventsTab.provenance.criticalityBadge', {
                    defaultMessage: 'Criticality {value}',
                    values: { value: event.criticality },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {event.confidence != null && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.streams.sigEventsTab.provenance.confidenceBadge', {
                    defaultMessage: 'Confidence {value}%',
                    values: { value: event.confidence },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {event.assessment_note ? (
            <RationalePanel
              icon="visGauge"
              title={i18n.translate('xpack.streams.sigEventsTab.provenance.assessmentNote', {
                defaultMessage: 'The judge’s assessment',
              })}
            >
              {event.assessment_note}
            </RationalePanel>
          ) : (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.sigEventsTab.provenance.noAssessment', {
                defaultMessage: 'No assessment rationale was recorded for this event.',
              })}
            </EuiText>
          )}
        </EuiFlexGroup>
      ),
    },
  ];

  const collapsedSummary = [
    detections.length > 0
      ? i18n.translate('xpack.streams.sigEventsTab.provenance.summaryRules', {
          defaultMessage: '{count, plural, one {# rule fired} other {# rules fired}}',
          values: { count: detections.length },
        })
      : undefined,
    discovery
      ? i18n.translate('xpack.streams.sigEventsTab.provenance.summaryDiscovery', {
          defaultMessage: 'correlated into a discovery',
        })
      : undefined,
    SIGNIFICANT_EVENT_STATUS_LABELS[event.status]?.toLowerCase(),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <EuiAccordion
      id={accordionId}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      data-test-subj="provenanceSection"
      buttonContent={
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiTitle size="xs">
            <h3>{SECTION_TITLE}</h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued" data-test-subj="provenanceSummaryLine">
            {collapsedSummary}
          </EuiText>
        </EuiFlexGroup>
      }
    >
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {SECTION_SUBTITLE}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSteps steps={steps} titleSize="xs" />
    </EuiAccordion>
  );
};
