/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiProgress,
  EuiScreenReaderLive,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { FlyoutTemplate } from '@kbn/flyout-template';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import {
  QueryClient,
  QueryClientProvider,
  useQueries,
  useQuery,
  type QueryFunctionContext,
} from '@kbn/react-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type {
  InvestigationLead,
  LeadRelationship,
  LeadSignalBand,
  LeadTimingBand,
  SignalAnalyzerComparison,
  SignalAnalyzerPivot,
  SignalAnalyzerResult,
} from '@kbn/signal-investigation-contract';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import {
  SIGNAL_INVESTIGATION_ANALYZERS_PATH,
  signalInvestigationLeadsPath,
} from '../../common/api';
import { buildSignalInvestigationChatAttachments } from '../../common/findings_attachment';
import { rankLeads } from '../../common/rank_leads';
import {
  AI_CHAT_EXPERIENCE_TYPE,
  AIChatExperience,
  canShowContinueWithAgent,
  checkAgentBuilderConnectorAvailable,
  registerFindingsAttachmentUiDefinition,
} from './agent_handoff';
import {
  buildAnalysisToolLink,
  buildLeadDrilldownHref,
  type AnalysisToolLink,
} from './aiops_links';
import { analyzerApplies, inapplicabilityMessage } from './analyzer_applicability';
import {
  MAX_SEED_HISTORY_ENTRIES,
  type CoverageItemState,
  type CoverageStatus,
  type DateFormatter,
  type SeedHistoryEntry,
  applyEntityPivot,
  buildAgentVerifyInitialMessage,
  canOfferWindowEntityPivot,
  createDateFormatter,
  extractLeadEntityPivot,
  formatAnchorDescription,
  formatComparisonWindows,
  formatCoverageLineText,
  formatLeadShiftMultiplier,
  formatPivotEntityLabel,
  formatSeedStepLabel,
  loadInvestigationSession,
  saveInvestigationSession,
  selectEmptyLeadsKind,
} from './flyout_state';
import {
  registerFlyoutTelemetryEvents,
  reportSignalInvestigationLeadClicked,
  reportSignalInvestigationLeadFeedback,
  reportSignalInvestigationOpened,
} from './flyout_telemetry';
import {
  SERVICE_HOSTS_ANALYZER_ID,
  combineCoverageMessages,
  isContextAnalyzer,
  isHostDependentAnalyzer,
  resolveHostPlan,
} from './host_resolution';
import type { ChartMetricOption } from '../actions/lens_seed_extractor';
import { LeadFeedbackControls, type LeadFeedbackVerdict } from './lead_feedback';
import { LeadPreviewContent, LeadPreviewFlyout } from './lead_preview';

type InvestigationFlyoutRef = ReturnType<CoreStart['overlays']['openFlyoutTemplate']>;

interface AnalyzerCatalogItem {
  id: string;
  displayName: string;
}

const queryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });

const httpStatus = (error: unknown): number | undefined => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
};

const failedResult = (error: unknown): SignalAnalyzerResult => {
  if (httpStatus(error) === 403) {
    return { leads: [], entities: {}, status: 'no_access' };
  }
  return { leads: [], entities: {}, status: 'skipped' };
};

const signalLabel = (signal: LeadSignalBand): string => {
  switch (signal) {
    case 'strong':
      return i18n.translate('xpack.signalInvestigation.flyout.signal.strong', {
        defaultMessage: 'strong signal',
      });
    case 'moderate':
      return i18n.translate('xpack.signalInvestigation.flyout.signal.moderate', {
        defaultMessage: 'moderate signal',
      });
    case 'weak':
      return i18n.translate('xpack.signalInvestigation.flyout.signal.weak', {
        defaultMessage: 'weak signal',
      });
    case 'unknown':
      return i18n.translate('xpack.signalInvestigation.flyout.signal.unknown', {
        defaultMessage: 'signal',
      });
  }
};

const timingLabel = (timing: LeadTimingBand): string => {
  switch (timing) {
    case 'before':
      return i18n.translate('xpack.signalInvestigation.flyout.timing.before', {
        defaultMessage: 'before the window',
      });
    case 'during':
      return i18n.translate('xpack.signalInvestigation.flyout.timing.during', {
        defaultMessage: 'during the window',
      });
    case 'after':
      return i18n.translate('xpack.signalInvestigation.flyout.timing.after', {
        defaultMessage: 'after the window',
      });
    case 'unknown':
      return i18n.translate('xpack.signalInvestigation.flyout.timing.unknown', {
        defaultMessage: 'unknown timing',
      });
  }
};

const relationshipLabel = (relationship: LeadRelationship): string => {
  switch (relationship) {
    case 'service':
      return i18n.translate('xpack.signalInvestigation.flyout.relationship.service', {
        defaultMessage: 'same service',
      });
    case 'dependency':
      return i18n.translate('xpack.signalInvestigation.flyout.relationship.dependency', {
        defaultMessage: 'one-hop dependency',
      });
    case 'host':
      return i18n.translate('xpack.signalInvestigation.flyout.relationship.host', {
        defaultMessage: 'same host',
      });
    case 'user':
      return i18n.translate('xpack.signalInvestigation.flyout.relationship.user', {
        defaultMessage: 'same user',
      });
    case 'network':
      return i18n.translate('xpack.signalInvestigation.flyout.relationship.network', {
        defaultMessage: 'same source IP',
      });
    case 'unknown':
      return i18n.translate('xpack.signalInvestigation.flyout.relationship.unknown', {
        defaultMessage: 'related',
      });
  }
};

const statusIcon = (status: CoverageStatus): string => {
  switch (status) {
    case 'found':
    case 'no_change':
    case 'indeterminable':
      return 'check';
    case 'no_access':
    case 'skipped':
      return 'minusInCircle';
    case 'not_set_up':
      return 'warning';
    case 'not_applicable':
      return 'minus';
    case 'running':
      return 'clock';
  }
};

const LOG_RATE_ANALYSIS_ID = 'log_rate_analysis';

const investigateEntityLabel = (value: string): string =>
  i18n.translate('xpack.signalInvestigation.flyout.investigateEntity', {
    defaultMessage: 'Investigate {entity}',
    values: { entity: formatPivotEntityLabel(value) },
  });

const LeadCard = ({
  lead,
  seed,
  drilldownHref,
  toolLink,
  comparison,
  entityPivot,
  data,
  formatDate,
  feedbackValue,
  feedbackEnabled,
  isInlinePreview,
  isExpanded,
  onLeadClick,
  onPivotClick,
  onFeedbackChange,
}: {
  lead: InvestigationLead;
  seed: InvestigationSeed;
  drilldownHref: string | undefined;
  toolLink: AnalysisToolLink;
  comparison?: SignalAnalyzerComparison;
  entityPivot?: SignalAnalyzerPivot;
  data?: DataPublicPluginStart;
  formatDate: DateFormatter;
  feedbackValue: LeadFeedbackVerdict | undefined;
  feedbackEnabled: boolean;
  isInlinePreview: boolean;
  isExpanded: boolean;
  onLeadClick: () => void;
  onPivotClick?: (pivot: SignalAnalyzerPivot) => void;
  onFeedbackChange: (next: LeadFeedbackVerdict | undefined) => void;
}) => {
  const previewPanelId = `signalInvestigationLeadPreview-${lead.id}`;
  return (
    <EuiPanel hasBorder paddingSize="l" hasShadow={false} data-test-subj="signalInvestigationLead">
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <p>
                  <EuiLink
                    onClick={onLeadClick}
                    aria-expanded={isInlinePreview ? isExpanded : undefined}
                    aria-controls={isInlinePreview ? previewPanelId : undefined}
                    data-test-subj="signalInvestigationLeadLink"
                    {...getEbtProps({
                      action: 'signalInvestigationLeadPreview',
                      element: 'signalInvestigationLeadCard',
                    })}
                  >
                    {lead.summary}
                  </EuiLink>
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LeadFeedbackControls
                leadId={lead.id}
                value={feedbackValue}
                feedbackEnabled={feedbackEnabled}
                onChange={onFeedbackChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <p>
              {comparison
                ? i18n.translate('xpack.signalInvestigation.flyout.leadRelevanceWithComparison', {
                    defaultMessage: '{relevance} · {comparison}',
                    values: {
                      relevance: lead.relevance,
                      comparison: formatComparisonWindows(comparison, formatDate),
                    },
                  })
                : lead.occurredAt
                ? i18n.translate('xpack.signalInvestigation.flyout.leadRelevanceWithTime', {
                    defaultMessage: '{relevance} · {occurredAt}',
                    values: { relevance: lead.relevance, occurredAt: formatDate(lead.occurredAt) },
                  })
                : lead.relevance}
            </p>
          </EuiText>
        </EuiFlexItem>
        {lead.shift ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={i18n.translate('xpack.signalInvestigation.flyout.shiftRateTooltipMessage', {
                defaultMessage:
                  'Document rate scaled to the length of the deviation window for direct comparison with the baseline window.',
              })}
            >
              <div
                tabIndex={0}
                role="group"
                aria-label={i18n.translate('xpack.signalInvestigation.flyout.shiftAriaLabel', {
                  defaultMessage: 'Normalized document rate comparison',
                })}
                data-test-subj={`signalInvestigationLeadShift-${lead.id}`}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem>
                    <EuiProgress
                      size="xs"
                      color="subdued"
                      value={lead.shift.baseline}
                      max={Math.max(lead.shift.baseline, lead.shift.deviation, 1)}
                      valueText={String(lead.shift.baseline)}
                      label={i18n.translate(
                        'xpack.signalInvestigation.flyout.shiftBaselineRateLabel',
                        {
                          defaultMessage: 'Baseline normalized rate',
                        }
                      )}
                      data-test-subj={`signalInvestigationShiftBaseline-${lead.id}`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiProgress
                      size="xs"
                      color="primary"
                      value={lead.shift.deviation}
                      max={Math.max(lead.shift.baseline, lead.shift.deviation, 1)}
                      valueText={String(lead.shift.deviation)}
                      label={i18n.translate(
                        'xpack.signalInvestigation.flyout.shiftDeviationRateLabel',
                        {
                          defaultMessage: 'Deviation normalized rate',
                        }
                      )}
                      data-test-subj={`signalInvestigationShiftDeviation-${lead.id}`}
                    />
                  </EuiFlexItem>
                  {(() => {
                    const multiplierLabel = formatLeadShiftMultiplier(lead.shift);
                    return multiplierLabel ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color="default"
                          data-test-subj={`signalInvestigationShiftMultiplier-${lead.id}`}
                        >
                          {multiplierLabel}
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : null;
                  })()}
                </EuiFlexGroup>
              </div>
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{signalLabel(lead.ranking.signal)}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{timingLabel(lead.ranking.timing)}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{relationshipLabel(lead.ranking.relationship)}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.signalInvestigation.flyout.foundUsingTechnique', {
                defaultMessage: 'Found using {technique}',
                values: { technique: toolLink.technique },
              })}
              {toolLink.href ? (
                <>
                  {' · '}
                  <EuiLink
                    href={toolLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    external
                    data-test-subj="signalInvestigationLeadToolLink"
                    {...getEbtProps({
                      action: 'signalInvestigationOpenDedicatedTool',
                      element: 'signalInvestigationLeadCard',
                    })}
                  >
                    {toolLink.label}
                  </EuiLink>
                </>
              ) : null}
              {entityPivot && onPivotClick ? (
                <>
                  {' · '}
                  <EuiLink
                    onClick={() => onPivotClick(entityPivot)}
                    data-test-subj={`signalInvestigationLeadPivot-${lead.id}`}
                    {...getEbtProps({
                      action: 'signalInvestigationPivotEntity',
                      element: 'signalInvestigationLeadCard',
                    })}
                  >
                    {investigateEntityLabel(entityPivot.value)}
                  </EuiLink>
                </>
              ) : null}
            </p>
          </EuiText>
        </EuiFlexItem>
        {isInlinePreview && isExpanded ? (
          <EuiFlexItem grow={false}>
            <EuiPanel
              id={previewPanelId}
              color="subdued"
              paddingSize="m"
              hasShadow={false}
              data-test-subj={`signalInvestigationLeadInlinePreview-${lead.id}`}
            >
              <LeadPreviewContent
                lead={lead}
                seed={seed}
                comparison={comparison}
                drilldownHref={drilldownHref}
                toolLink={toolLink}
                data={data}
                formatDate={formatDate}
              />
            </EuiPanel>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const InvestigationFlyoutBody = ({
  core,
  data,
  share,
  licensing,
  agentBuilder,
  seed: initialSeed,
  session = 'start',
  metricOptions = [],
  initialMetricId,
  metricUnreadable = false,
  previousSeedLabel,
  feedbackByLead: controlledFeedbackByLead,
  onFeedbackByLeadChange,
  onMetricChange,
  onPivot,
  onBack,
  onClose,
}: {
  core: CoreStart;
  data?: DataPublicPluginStart;
  share?: SharePluginStart;
  licensing?: LicensingPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  seed: InvestigationSeed;
  session?: 'start' | 'inherit';
  metricOptions?: readonly ChartMetricOption[];
  initialMetricId?: string;
  metricUnreadable?: boolean;
  previousSeedLabel?: string;
  feedbackByLead?: Readonly<Record<string, LeadFeedbackVerdict | undefined>>;
  onFeedbackByLeadChange?: (
    updater: (
      current: Record<string, LeadFeedbackVerdict | undefined>
    ) => Record<string, LeadFeedbackVerdict | undefined>
  ) => void;
  onMetricChange?: (metricId: string) => void;
  onPivot?: (nextSeed: InvestigationSeed, currentMetricId: string | undefined) => void;
  onBack?: () => void;
  onClose: () => void;
}) => {
  const [selectedMetricId, setSelectedMetricId] = useState<string | undefined>(
    initialMetricId ?? metricOptions[0]?.id
  );
  const selectedMetric =
    metricOptions.find((option) => option.id === selectedMetricId) ?? metricOptions[0];
  const seed: InvestigationSeed = useMemo(
    () =>
      metricOptions.length > 1 && selectedMetric
        ? {
            ...initialSeed,
            metric: {
              operationType: selectedMetric.operationType,
              ...(selectedMetric.field ? { field: selectedMetric.field } : {}),
            },
          }
        : initialSeed,
    [initialSeed, metricOptions.length, selectedMetric]
  );

  const childFlyoutRef = useRef<InvestigationFlyoutRef | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const isInlinePreview = session === 'inherit';

  const closeChildFlyout = useCallback(() => {
    const ref = childFlyoutRef.current;
    childFlyoutRef.current = null;
    if (ref && typeof ref.close === 'function') {
      void ref.close();
    }
  }, []);

  useEffect(() => {
    setExpandedLeadId(null);
    return () => {
      closeChildFlyout();
    };
  }, [seed, closeChildFlyout]);

  useEffect(() => {
    registerFindingsAttachmentUiDefinition(agentBuilder);
  }, [agentBuilder]);

  const license = useObservable(licensing?.license$ ?? EMPTY);
  const hasEnterpriseLicense = Boolean(license?.hasAtLeast('enterprise'));
  const hasAgentBuilderCapability = core.application.capabilities.agentBuilder?.show === true;
  const chatExperience$ = useMemo(() => {
    if (typeof core.uiSettings?.get$ === 'function') {
      return core.uiSettings.get$<string>(AI_CHAT_EXPERIENCE_TYPE);
    }
    return EMPTY;
  }, [core.uiSettings]);
  const initialChatExperience = (() => {
    try {
      return core.uiSettings?.get<string>(AI_CHAT_EXPERIENCE_TYPE);
    } catch {
      return undefined;
    }
  })();
  const chatExperience = useObservable(chatExperience$, initialChatExperience);
  const hasOpenChat = typeof agentBuilder?.openChat === 'function';

  const connectorQuery = useQuery({
    queryKey: ['signalInvestigation', 'agentBuilderConnector'],
    enabled:
      hasEnterpriseLicense &&
      hasAgentBuilderCapability &&
      chatExperience === AIChatExperience.Agent &&
      hasOpenChat,
    queryFn: () => checkAgentBuilderConnectorAvailable({ core, agentBuilder }),
  });

  const canContinueWithAgent = canShowContinueWithAgent({
    hasEnterpriseLicense,
    hasAgentBuilderCapability,
    chatExperience,
    hasConnector: Boolean(connectorQuery.data),
    hasOpenChat,
  });

  const canUseAiops = Boolean(core.application.capabilities.ml?.canUseAiops);
  const basePath = core.http.basePath.get();
  const formatDate = createDateFormatter(core.uiSettings.get<string>('dateFormat'));
  const catalog = useQuery({
    queryKey: ['signalInvestigation', 'analyzers'],
    queryFn: async ({ signal }) =>
      core.http.get<{ analyzers: AnalyzerCatalogItem[] }>(SIGNAL_INVESTIGATION_ANALYZERS_PATH, {
        version: '1',
        signal,
      }),
  });

  const allAnalyzers = catalog.data?.analyzers ?? [];
  const hasServiceHostsInCatalog = allAnalyzers.some((analyzer) => isContextAnalyzer(analyzer.id));
  const analyzers = allAnalyzers.filter((analyzer) => !isContextAnalyzer(analyzer.id));

  const serviceHostsQuery = useQuery({
    queryKey: ['signalInvestigation', 'leads', SERVICE_HOSTS_ANALYZER_ID, seed],
    enabled: hasServiceHostsInCatalog && Boolean(seed.entities['service.name']),
    queryFn: async ({ signal }) => {
      try {
        return await core.http.post<SignalAnalyzerResult>(
          signalInvestigationLeadsPath(SERVICE_HOSTS_ANALYZER_ID),
          {
            body: JSON.stringify(seed),
            version: '1',
            signal,
          }
        );
      } catch (error) {
        return failedResult(error);
      }
    },
  });

  const hostPlan = resolveHostPlan({
    seed,
    hasServiceHostsInCatalog,
    serviceHostsLoading: serviceHostsQuery.isLoading,
    serviceHostsResult: serviceHostsQuery.data as SignalAnalyzerResult | undefined,
  });

  const leadQueries = useQueries({
    queries: analyzers.map((analyzer) => {
      const hostDependent = isHostDependentAnalyzer(analyzer.id);
      const requestSeed = hostDependent ? hostPlan.seedForHostAnalysis : seed;
      const enabled = hostDependent
        ? !hostPlan.waitingForServiceHosts &&
          hostPlan.hosts.length > 0 &&
          analyzerApplies(analyzer.id, requestSeed)
        : analyzerApplies(analyzer.id, seed);
      return {
        queryKey: ['signalInvestigation', 'leads', analyzer.id, requestSeed],
        enabled,
        queryFn: async (context: QueryFunctionContext) => {
          try {
            return await core.http.post<SignalAnalyzerResult>(
              signalInvestigationLeadsPath(analyzer.id),
              {
                body: JSON.stringify(requestSeed),
                version: '1',
                signal: context.signal,
              }
            );
          } catch (error) {
            return failedResult(error);
          }
        },
      };
    }),
  });

  const coverage: CoverageItemState[] = analyzers.map((analyzer, index) => {
    const query = leadQueries[index];
    const result = query?.data as SignalAnalyzerResult | undefined;
    const hostDependent = isHostDependentAnalyzer(analyzer.id);

    const resolvedStatus: CoverageStatus = (() => {
      if (hostDependent) {
        if (hostPlan.waitingForServiceHosts) {
          return 'running';
        }
        if (hostPlan.skippedStatus) {
          return hostPlan.skippedStatus;
        }
      }
      if (!analyzerApplies(analyzer.id, hostDependent ? hostPlan.seedForHostAnalysis : seed)) {
        return 'not_applicable';
      }
      if (!query || query.isLoading) {
        return 'running';
      }
      return result?.status ?? 'skipped';
    })();

    const toolLink = buildAnalysisToolLink({
      analyzerId: analyzer.id,
      seed,
      share,
      canUseAiops,
      status: resolvedStatus,
      basePath,
    });

    if (resolvedStatus === 'not_applicable') {
      return {
        id: analyzer.id,
        name: analyzer.displayName,
        technique: toolLink.technique,
        status: 'not_applicable' as const,
        foundCount: 0,
        message: hostDependent
          ? hostPlan.skippedMessage ?? inapplicabilityMessage(analyzer.id, seed)
          : inapplicabilityMessage(analyzer.id, seed),
        toolLinkLabel: toolLink.label,
        toolLinkHref: toolLink.href,
      };
    }
    if (resolvedStatus === 'running') {
      return {
        id: analyzer.id,
        name: analyzer.displayName,
        technique: toolLink.technique,
        status: 'running' as const,
        foundCount: 0,
        toolLinkLabel: toolLink.label,
        toolLinkHref: toolLink.href,
      };
    }
    if (hostDependent && hostPlan.skippedStatus) {
      return {
        id: analyzer.id,
        name: analyzer.displayName,
        technique: toolLink.technique,
        status: hostPlan.skippedStatus,
        foundCount: 0,
        message: hostPlan.skippedMessage,
        toolLinkLabel: toolLink.label,
        toolLinkHref: toolLink.href,
      };
    }
    return {
      id: analyzer.id,
      name: analyzer.displayName,
      technique: toolLink.technique,
      status: resolvedStatus,
      foundCount: result?.leads.length ?? 0,
      message: hostDependent
        ? combineCoverageMessages(result?.message, hostPlan.fallbackMessage)
        : result?.message,
      comparison: analyzer.id === LOG_RATE_ANALYSIS_ID ? result?.comparison : undefined,
      toolLinkLabel: toolLink.label,
      toolLinkHref: toolLink.href,
    };
  });

  const logRateQueryIndex = analyzers.findIndex((analyzer) => analyzer.id === LOG_RATE_ANALYSIS_ID);
  const logRateResult =
    logRateQueryIndex >= 0
      ? (leadQueries[logRateQueryIndex]?.data as SignalAnalyzerResult | undefined)
      : undefined;
  const logRateComparison = logRateResult?.comparison;
  const windowEntityPivot =
    canOfferWindowEntityPivot(seed) && logRateResult?.pivot ? logRateResult.pivot : undefined;

  const triggerPivot = (pivot: SignalAnalyzerPivot): void => {
    closeChildFlyout();
    onPivot?.(applyEntityPivot(seed, pivot), selectedMetric?.id);
  };

  const handleBack = (): void => {
    closeChildFlyout();
    onBack?.();
  };

  const handleClose = (): void => {
    closeChildFlyout();
    onClose();
  };

  const leads = rankLeads(
    leadQueries.flatMap((query) => (query.data as SignalAnalyzerResult | undefined)?.leads ?? [])
  );

  const [localFeedbackByLead, setLocalFeedbackByLead] = useState<
    Record<string, LeadFeedbackVerdict | undefined>
  >({});
  const feedbackByLead = controlledFeedbackByLead ?? localFeedbackByLead;
  const updateFeedbackByLead = onFeedbackByLeadChange ?? setLocalFeedbackByLead;
  const feedbackEnabled = core.notifications.feedback.isEnabled();

  const openLeadPreview = (
    lead: InvestigationLead,
    rank: number,
    toolLink: AnalysisToolLink,
    drilldownHref: string | undefined
  ): void => {
    if (isInlinePreview) {
      const willExpand = expandedLeadId !== lead.id;
      if (willExpand) {
        reportSignalInvestigationLeadClicked(core.analytics, {
          analyzerId: lead.analyzerId,
          rank,
        });
      }
      setExpandedLeadId(willExpand ? lead.id : null);
      return;
    }

    reportSignalInvestigationLeadClicked(core.analytics, {
      analyzerId: lead.analyzerId,
      rank,
    });

    closeChildFlyout();
    const comparison = lead.analyzerId === LOG_RATE_ANALYSIS_ID ? logRateComparison : undefined;
    let openedRef: InvestigationFlyoutRef | null = null;
    openedRef = core.overlays.openFlyoutTemplate(
      {
        size: 's',
        session: 'inherit',
        'data-test-subj': 'signalInvestigationLeadPreviewFlyout',
        onClose: () => {
          if (childFlyoutRef.current === openedRef) {
            childFlyoutRef.current = null;
          }
        },
      },
      ({ onClose: closePreview }) => (
        <LeadPreviewFlyout
          lead={lead}
          seed={seed}
          comparison={comparison}
          drilldownHref={drilldownHref}
          toolLink={toolLink}
          data={data}
          formatDate={formatDate}
          onClose={closePreview}
        />
      )
    );
    childFlyoutRef.current = openedRef ?? null;
  };

  const settled = coverage.filter((item) => item.status !== 'running').length;
  const total = coverage.length;
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      setAnnouncement(
        i18n.translate('xpack.signalInvestigation.flyout.announcement', {
          defaultMessage:
            '{leads, plural, one {# investigation lead} other {# investigation leads}}. {settled} of {total} analyses complete.',
          values: { leads: leads.length, settled, total },
        })
      );
    }, 400);
    return () => clearTimeout(handle);
  }, [leads.length, settled, total]);

  const ran = coverage.filter(
    (item) =>
      item.status === 'found' || item.status === 'no_change' || item.status === 'indeterminable'
  ).length;
  const notSetUp = coverage.filter((item) => item.status === 'not_set_up').length;
  const skipped = coverage.filter(
    (item) =>
      item.status === 'skipped' || item.status === 'not_applicable' || item.status === 'no_access'
  ).length;
  const finished = total > 0 && settled === total;
  const emptyKind = selectEmptyLeadsKind({
    catalogError: catalog.isError,
    analyzerCount: analyzers.length,
    finished,
    leadCount: leads.length,
    coverage,
  });

  const leadsBody = (() => {
    if (catalog.isLoading) {
      return (
        <EuiProgress
          size="xs"
          data-test-subj="signalInvestigationProgress"
          label={i18n.translate('xpack.signalInvestigation.flyout.loadingAnalyses', {
            defaultMessage: 'Loading analyses',
          })}
        />
      );
    }
    if (emptyKind === 'catalog_error') {
      return (
        <EuiEmptyPrompt
          iconType="warning"
          titleSize="xs"
          color="subdued"
          title={
            <h3>
              {i18n.translate('xpack.signalInvestigation.flyout.catalogErrorTitle', {
                defaultMessage: 'Couldn’t load analyses',
              })}
            </h3>
          }
          body={i18n.translate('xpack.signalInvestigation.flyout.catalogErrorBody', {
            defaultMessage: 'The list of available analyses couldn’t be loaded.',
          })}
        />
      );
    }
    if (emptyKind === 'no_analyzers') {
      return (
        <EuiEmptyPrompt
          iconType="magnify"
          titleSize="xs"
          color="subdued"
          title={
            <h3>
              {i18n.translate('xpack.signalInvestigation.flyout.noAnalysesTitle', {
                defaultMessage: 'No analyses are available',
              })}
            </h3>
          }
          body={i18n.translate('xpack.signalInvestigation.flyout.noAnalysesBody', {
            defaultMessage: 'No analyses are registered in this Kibana.',
          })}
        />
      );
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="signalInvestigationLeadList">
        {windowEntityPivot && onPivot ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => triggerPivot(windowEntityPivot)}
              data-test-subj="signalInvestigationWindowPivot"
              {...getEbtProps({
                action: 'signalInvestigationPivotEntity',
                element: 'signalInvestigationLeadsHeader',
              })}
            >
              {investigateEntityLabel(windowEntityPivot.value)}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        {!finished ? (
          <EuiFlexItem grow={false}>
            <EuiProgress
              size="xs"
              value={settled}
              max={Math.max(total, 1)}
              data-test-subj="signalInvestigationProgress"
              label={i18n.translate('xpack.signalInvestigation.flyout.progress', {
                defaultMessage: '{settled} of {total} analyses complete',
                values: { settled, total },
              })}
            />
          </EuiFlexItem>
        ) : null}
        <EuiScreenReaderLive>{announcement}</EuiScreenReaderLive>
        {leads.map((lead, index) => {
          const rank = index + 1;
          const toolLink = buildAnalysisToolLink({
            analyzerId: lead.analyzerId,
            seed,
            share,
            canUseAiops,
          });
          const drilldownHref = buildLeadDrilldownHref({ lead, seed, share });
          const leadPivot = onPivot ? extractLeadEntityPivot(lead, seed) : undefined;
          return (
            <EuiFlexItem key={lead.id} grow={false}>
              <LeadCard
                lead={lead}
                seed={seed}
                drilldownHref={drilldownHref}
                toolLink={toolLink}
                comparison={
                  lead.analyzerId === LOG_RATE_ANALYSIS_ID ? logRateComparison : undefined
                }
                entityPivot={leadPivot}
                data={data}
                formatDate={formatDate}
                feedbackValue={feedbackByLead[lead.id]}
                feedbackEnabled={feedbackEnabled}
                isInlinePreview={isInlinePreview}
                isExpanded={isInlinePreview && expandedLeadId === lead.id}
                onLeadClick={() => openLeadPreview(lead, rank, toolLink, drilldownHref)}
                onPivotClick={onPivot ? triggerPivot : undefined}
                onFeedbackChange={(next) => {
                  updateFeedbackByLead((current) => ({ ...current, [lead.id]: next }));
                  if (next !== undefined) {
                    reportSignalInvestigationLeadFeedback(core.analytics, {
                      analyzerId: lead.analyzerId,
                      rank,
                      verdict: next,
                    });
                  }
                }}
              />
            </EuiFlexItem>
          );
        })}
        {emptyKind === 'no_strong_changes' && (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              iconType="magnify"
              titleSize="xs"
              color="subdued"
              title={
                <h3>
                  {i18n.translate('xpack.signalInvestigation.flyout.noStrongChangesTitle', {
                    defaultMessage: 'No strong related changes found',
                  })}
                </h3>
              }
              body={i18n.translate('xpack.signalInvestigation.flyout.noStrongChangesBody', {
                defaultMessage: 'Checked {anchor}.',
                values: { anchor: formatAnchorDescription(seed, formatDate) },
              })}
            />
          </EuiFlexItem>
        )}
        {emptyKind === 'partial_checked' && (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              iconType="warning"
              titleSize="xs"
              color="subdued"
              title={
                <h3>
                  {i18n.translate('xpack.signalInvestigation.flyout.partialCheckedTitle', {
                    defaultMessage: 'No related changes in what we could check',
                  })}
                </h3>
              }
              body={i18n.translate('xpack.signalInvestigation.flyout.partialCheckedBody', {
                defaultMessage: 'Open Analysis coverage to see what could and couldn’t run.',
              })}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  })();

  return (
    <FlyoutTemplate onClose={handleClose}>
      <FlyoutTemplate.Header
        title={i18n.translate('xpack.signalInvestigation.flyout.title', {
          defaultMessage: 'Find related changes',
        })}
        description={
          <div>
            {previousSeedLabel && onBack ? (
              <div>
                <EuiLink
                  onClick={handleBack}
                  data-test-subj="signalInvestigationBackLink"
                  {...getEbtProps({
                    action: 'signalInvestigationPivotBack',
                    element: 'signalInvestigationFlyoutHeader',
                  })}
                >
                  {i18n.translate('xpack.signalInvestigation.flyout.backToPreviousScope', {
                    defaultMessage: 'Back to {scope}',
                    values: { scope: previousSeedLabel },
                  })}
                </EuiLink>
              </div>
            ) : null}
            <div>{formatAnchorDescription(seed, formatDate)}</div>
            {metricUnreadable ? (
              <div data-test-subj="signalInvestigationMetricUnreadable">
                {i18n.translate('xpack.signalInvestigation.flyout.metricUnreadable', {
                  defaultMessage:
                    'Chart metric could not be read; running entity and time-window analyses.',
                })}
              </div>
            ) : null}
            {metricOptions.length > 1 ? (
              <>
                <EuiSpacer size="xs" />
                <EuiSelect
                  compressed
                  aria-label={i18n.translate('xpack.signalInvestigation.flyout.metricPickerAria', {
                    defaultMessage: 'Chart metric',
                  })}
                  data-test-subj="signalInvestigationMetricPicker"
                  {...getEbtProps({
                    action: 'signalInvestigationSelectChartMetric',
                    element: 'signalInvestigationFlyoutHeader',
                  })}
                  value={selectedMetric?.id ?? ''}
                  onChange={(event) => {
                    const nextMetricId = event.target.value;
                    setSelectedMetricId(nextMetricId);
                    onMetricChange?.(nextMetricId);
                  }}
                  options={metricOptions.map((option) => ({
                    value: option.id,
                    text: option.label,
                  }))}
                />
              </>
            ) : null}
          </div>
        }
      />
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.Callout
          level="info"
          title={i18n.translate('xpack.signalInvestigation.flyout.disclaimerTitle', {
            defaultMessage: 'Not a cause',
          })}
        >
          {i18n.translate('xpack.signalInvestigation.flyout.disclaimer', {
            defaultMessage:
              'These are statistical observations, not causes. A lead can be a coincidence.',
          })}
        </FlyoutTemplate.Body.Callout>
        {emptyKind === 'no_entity' ? (
          <FlyoutTemplate.Body.Accordion
            id="leads"
            initialIsOpen
            data-test-subj="signalInvestigationLeadsAccordion"
            title={i18n.translate('xpack.signalInvestigation.flyout.leadsTitle', {
              defaultMessage:
                '{count, plural, one {Investigation lead ({count})} other {Investigation leads ({count})}}',
              values: { count: 0 },
            })}
          >
            <EuiEmptyPrompt
              iconType="magnify"
              titleSize="xs"
              color="subdued"
              title={
                <h3>
                  {i18n.translate('xpack.signalInvestigation.flyout.needEntityTitle', {
                    defaultMessage: 'No entity to analyze',
                  })}
                </h3>
              }
              body={i18n.translate('xpack.signalInvestigation.flyout.needEntityBody', {
                defaultMessage:
                  'These analyses need a service or host name. Open a service or host alert, or filter to an entity.',
              })}
            />
          </FlyoutTemplate.Body.Accordion>
        ) : (
          <>
            <FlyoutTemplate.Body.Accordion
              id="leads"
              initialIsOpen
              data-test-subj="signalInvestigationLeadsAccordion"
              title={i18n.translate('xpack.signalInvestigation.flyout.leadsTitle', {
                defaultMessage:
                  '{count, plural, one {Investigation lead ({count})} other {Investigation leads ({count})}}',
                values: { count: leads.length },
              })}
            >
              {leadsBody}
            </FlyoutTemplate.Body.Accordion>
            <FlyoutTemplate.Body.Accordion
              id="coverage"
              data-test-subj="signalInvestigationCoverageAccordion"
              title={i18n.translate('xpack.signalInvestigation.flyout.coverageTitle', {
                defaultMessage:
                  'Analysis coverage: {ran} ran, {skipped} skipped, {notSetUp} not set up',
                values: { ran, skipped, notSetUp },
              })}
            >
              <EuiListGroup maxWidth={false}>
                {coverage.map((item) => (
                  <EuiListGroupItem
                    key={item.id}
                    iconType={statusIcon(item.status)}
                    wrapText
                    data-test-subj={`signalInvestigationCoverageItem-${item.id}`}
                    label={
                      <span>
                        {formatCoverageLineText(item, seed, formatDate)}
                        {item.toolLinkHref ? (
                          <>
                            {' · '}
                            <EuiLink
                              href={item.toolLinkHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              external
                              data-test-subj={`signalInvestigationCoverageLink-${item.id}`}
                              {...getEbtProps({
                                action: 'signalInvestigationOpenDedicatedTool',
                                element: 'signalInvestigationCoverageList',
                              })}
                            >
                              {item.toolLinkLabel}
                            </EuiLink>
                          </>
                        ) : null}
                      </span>
                    }
                  />
                ))}
              </EuiListGroup>
            </FlyoutTemplate.Body.Accordion>
          </>
        )}
      </FlyoutTemplate.Body>
      {canContinueWithAgent ? (
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.SecondaryAction
            label={i18n.translate('xpack.signalInvestigation.flyout.continueWithAgent', {
              defaultMessage: 'Continue with AI agent',
            })}
            iconType="productAgent"
            data-test-subj="signalInvestigationContinueWithAgent"
            onClick={() => {
              const attachments = buildSignalInvestigationChatAttachments({
                seed,
                plan: coverage,
                leads,
                feedbackByLead,
              });
              agentBuilder?.openChat({
                newConversation: true,
                initialMessage: buildAgentVerifyInitialMessage(leads, feedbackByLead),
                attachments,
              });
            }}
            {...getEbtProps({
              action: 'signalInvestigationContinueWithAgent',
              element: 'signalInvestigationFlyoutFooter',
            })}
          />
        </FlyoutTemplate.Footer>
      ) : null}
    </FlyoutTemplate>
  );
};

const seedHistoryKey = (seed: InvestigationSeed, index: number): string =>
  `${index}:${seed.entities['service.name'] ?? ''}:${seed.entities['host.name'] ?? ''}:${
    seed.entities['user.name'] ?? ''
  }:${seed.entities['source.ip'] ?? ''}`;

export const InvestigationFlyoutContainer = ({
  core,
  data,
  share,
  licensing,
  agentBuilder,
  seed: initialSeed,
  session = 'start',
  metricOptions,
  metricUnreadable,
  onClose,
}: {
  core: CoreStart;
  data?: DataPublicPluginStart;
  share?: SharePluginStart;
  licensing?: LicensingPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  seed: InvestigationSeed;
  session?: 'start' | 'inherit';
  metricOptions?: readonly ChartMetricOption[];
  metricUnreadable?: boolean;
  onClose: () => void;
}) => {
  const initialRestored = useMemo(() => loadInvestigationSession({ initialSeed }), [initialSeed]);
  const [history, setHistory] = useState<readonly SeedHistoryEntry[]>(
    () => initialRestored?.history ?? [{ seed: initialSeed, metricId: metricOptions?.[0]?.id }]
  );
  const [feedbackByLead, setFeedbackByLead] = useState<
    Record<string, LeadFeedbackVerdict | undefined>
  >(() => ({ ...(initialRestored?.feedbackByLead ?? {}) }));

  useEffect(() => {
    saveInvestigationSession({
      initialSeed,
      history,
      feedbackByLead,
    });
  }, [initialSeed, history, feedbackByLead]);

  const currentIndex = history.length - 1;
  const current = history[currentIndex] ?? { seed: initialSeed, metricId: metricOptions?.[0]?.id };
  const previous = currentIndex > 0 ? history[currentIndex - 1] : undefined;

  return (
    <InvestigationFlyoutBody
      key={seedHistoryKey(current.seed, currentIndex)}
      core={core}
      data={data}
      share={share}
      licensing={licensing}
      agentBuilder={agentBuilder}
      seed={current.seed}
      session={session}
      metricOptions={metricOptions}
      initialMetricId={current.metricId}
      metricUnreadable={metricUnreadable}
      previousSeedLabel={previous ? formatSeedStepLabel(previous.seed) : undefined}
      feedbackByLead={feedbackByLead}
      onFeedbackByLeadChange={setFeedbackByLead}
      onMetricChange={(nextMetricId) => {
        setHistory((prev) => {
          if (prev.length === 0) {
            return prev;
          }
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            metricId: nextMetricId,
          };
          return updated;
        });
      }}
      onPivot={(nextSeed, currentMetricId) => {
        setFeedbackByLead({});
        setHistory((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              metricId: currentMetricId,
            };
          }
          const nextHistory = [...updated, { seed: nextSeed, metricId: currentMetricId }];
          return nextHistory.length > MAX_SEED_HISTORY_ENTRIES
            ? [nextHistory[0], ...nextHistory.slice(-(MAX_SEED_HISTORY_ENTRIES - 1))]
            : nextHistory;
        });
      }}
      onBack={
        previous
          ? () => {
              setFeedbackByLead({});
              setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
            }
          : undefined
      }
      onClose={onClose}
    />
  );
};

export const openInvestigationFlyout = ({
  core,
  data,
  share,
  licensing,
  agentBuilder,
  seed,
  session,
  metricOptions,
  metricUnreadable,
}: {
  core: CoreStart;
  data?: DataPublicPluginStart;
  share?: SharePluginStart;
  licensing?: LicensingPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  seed: InvestigationSeed;
  session: 'start' | 'inherit';
  metricOptions?: readonly ChartMetricOption[];
  metricUnreadable?: boolean;
}): void => {
  registerFlyoutTelemetryEvents();
  registerFindingsAttachmentUiDefinition(agentBuilder);
  reportSignalInvestigationOpened(core.analytics, seed);

  const client = queryClient();
  core.overlays.openFlyoutTemplate(
    { size: 'm', session, 'data-test-subj': 'signalInvestigationFlyout' },
    ({ onClose }) => (
      <QueryClientProvider client={client}>
        <InvestigationFlyoutContainer
          core={core}
          data={data}
          share={share}
          licensing={licensing}
          agentBuilder={agentBuilder}
          seed={seed}
          session={session}
          metricOptions={metricOptions}
          metricUnreadable={metricUnreadable}
          onClose={onClose}
        />
      </QueryClientProvider>
    )
  );
};
