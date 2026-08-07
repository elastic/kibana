/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, Direction, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { isComputedFeature, QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingPanel } from '../../../../components/loading_panel';
import { KnowledgeIndicatorActionsCell } from '../../../../components/knowledge_indicators/knowledge_indicator_actions_cell';
import { KnowledgeIndicatorDetailsFlyout } from '../../../../components/knowledge_indicators/knowledge_indicator_details_flyout';
import { KnowledgeIndicatorSourceBadge } from '../../../../components/knowledge_indicators/knowledge_indicator_source_badge';
import { KnowledgeIndicatorsStatusFilter } from '../../../../components/knowledge_indicators/knowledge_indicators_status_filter';
import { KnowledgeIndicatorsSubtypeFilter } from '../../../../components/knowledge_indicators/knowledge_indicators_subtype_filter';
import { KnowledgeIndicatorsTypeFilter } from '../../../../components/knowledge_indicators/knowledge_indicators_type_filter';
import { DeleteTableItemsModal } from '../../../../components/knowledge_indicators/delete_table_items_modal';
import { getFeaturesFromKIs } from '../../../../components/knowledge_indicators/utils/get_features_from_kis';
import { getKnowledgeIndicatorItemId } from '../../../../components/knowledge_indicators/utils/get_knowledge_indicator_item_id';
import { getKnowledgeIndicatorRepository } from '../../../../components/knowledge_indicators/utils/get_knowledge_indicator_repository';
import {
  getKnowledgeIndicatorSource,
  sourceDisplayKind,
} from '../../../../components/knowledge_indicators/utils/get_knowledge_indicator_source';
import { getKnowledgeIndicatorStreamName } from '../../../../components/knowledge_indicators/utils/get_knowledge_indicator_stream_name';
import { matchesKnowledgeIndicatorFilters } from '../../../../components/knowledge_indicators/utils/matches_knowledge_indicator_filters';
import { useCodeIntelligenceAvailability } from '../../../../hooks/use_code_intelligence_availability';
import { useCodeIntelligenceRun } from '../../../../hooks/use_code_intelligence_run';
import { useCodeIntelligenceRunStatus } from '../../../../hooks/use_code_intelligence_run_status';
import { useCodeIntelligenceServiceDistribution } from '../../../../hooks/use_code_intelligence_service_distribution';
import { useDiscoveryFeaturesApi } from '../../../../hooks/use_discovery_features_api';
import { useFetchCodeKnowledgeIndicators } from '../../../../hooks/use_fetch_code_knowledge_indicators';
import { useKibana } from '../../../../hooks/use_kibana';
import { useKnowledgeIndicatorsBulkDelete } from '../../../../hooks/use_knowledge_indicators_bulk_delete';
import { useBlocksNewActivity } from '../../../../hooks/use_significant_events_maintenance';
import { useSignificantEventsPrivileges } from '../../../../hooks/use_significant_events_privileges';
import {
  CodeIntelligenceAvailabilityError,
  CodeIntelligencePlaceholder,
} from './code_intelligence_placeholder';
import { CodeIntelligenceServiceDistribution } from './code_intelligence_service_distribution';
import { CodeIntelligenceLanguageDistribution } from './code_intelligence_language_distribution';
import { CodeIntelligenceRepositoryTypeDistribution } from './code_intelligence_repository_type_distribution';
import { RepositoryFilter } from './repository_filter';

const capitalizeStyle = css`
  text-transform: capitalize;
`;

const getTitle = (ki: KnowledgeIndicator): string =>
  ki.kind === 'feature' ? ki.feature.title ?? ki.feature.id : ki.query.title ?? ki.query.id;

/**
 * Human label for a code feature's Type column, keyed by subtype so the column
 * reads "Service" / "Language" / "Repository type" rather than the raw
 * `code_analysis` feature type. Falls back to the subtype, then the type.
 */
const getFeatureTypeLabel = (subtype: string | undefined, type: string): string => {
  switch (subtype) {
    case 'service':
    case 'service_name':
      return FEATURE_TYPE_SERVICE_LABEL;
    case 'language':
      return FEATURE_TYPE_LANGUAGE_LABEL;
    case 'repo_type':
      return FEATURE_TYPE_REPO_LABEL;
    default:
      return subtype ?? type;
  }
};

/** Stable, human-readable value used to sort the Type column. */
const getTypeSortValue = (ki: KnowledgeIndicator): string =>
  ki.kind === 'feature'
    ? getFeatureTypeLabel(ki.feature.subtype, ki.feature.type)
    : ki.query.type === QUERY_TYPE_STATS
    ? STATS_QUERY_LABEL
    : MATCH_QUERY_LABEL;

const NO_OCCURRENCES: Record<string, Array<{ x: number; y: number }>> = {};
const EMPTY_STREAMS: string[] = [];
const isCodeVirtualFeature = (ki: KnowledgeIndicator): boolean =>
  ki.kind === 'feature' && ki.feature.stream_name.startsWith('code:');

export function CodeIntelligenceTab() {
  const {
    available,
    message: availabilityMessage,
    error: availabilityError,
    isLoading: isAvailabilityLoading,
    refetch: refetchAvailability,
  } = useCodeIntelligenceAvailability();
  const {
    knowledgeIndicators: codeKnowledgeIndicators,
    isLoading,
    isTruncated,
    error: codeKnowledgeIndicatorsError,
    refetch,
  } = useFetchCodeKnowledgeIndicators({ enabled: available });
  const [activeExecutionId, setActiveExecutionId] = useState<string | undefined>(undefined);
  const { runAll, isRunningAll, reset, isResetting, reconcile, isReconciling } =
    useCodeIntelligenceRun({ onRunStarted: setActiveExecutionId });
  const {
    isRunning,
    error: runStatusError,
    refetch: refetchRunStatus,
  } = useCodeIntelligenceRunStatus({
    enabled: available,
    executionId: activeExecutionId,
  });
  const distribution = useCodeIntelligenceServiceDistribution({ enabled: available });
  const { deleteKnowledgeIndicatorsInBulk, isDeleting } = useKnowledgeIndicatorsBulkDelete({
    onSuccess: () => {
      setSelectedKnowledgeIndicators([]);
      refetch();
    },
  });
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useDiscoveryFeaturesApi();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const {
    ui: { manage: canManage },
  } = useSignificantEventsPrivileges();
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();

  const [selectedKnowledgeIndicatorId, setSelectedKnowledgeIndicatorId] = useState<
    string | undefined
  >(undefined);
  const [knowledgeIndicatorsToDelete, setKnowledgeIndicatorsToDelete] = useState<
    KnowledgeIndicator[]
  >([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const resetModalTitleId = useGeneratedHtmlId();

  // Toolbar filter + selection state.
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'excluded'>('active');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  // Code features (repo_type/language) are "computed" types, so show them by default.
  const [hideComputedTypes, setHideComputedTypes] = useState(false);
  const [selectedKnowledgeIndicators, setSelectedKnowledgeIndicators] = useState<
    KnowledgeIndicator[]
  >([]);
  const [isBulkInProgress, setIsBulkInProgress] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [sortField, setSortField] = useState<string>('repository');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const handleTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<KnowledgeIndicator>) => {
      if (sort) {
        setSortField(sort.field as string);
        setSortDirection(sort.direction);
      }
      if (page) {
        setPagination({ pageIndex: page.index, pageSize: page.size });
      }
    },
    []
  );

  const sorting = useMemo(
    () => ({
      sort: { field: sortField as keyof KnowledgeIndicator, direction: sortDirection },
    }),
    [sortField, sortDirection]
  );

  // Reset to the first page and clear selection whenever active filters change
  // so hidden rows cannot be affected by a subsequent bulk action.
  useEffect(() => {
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
    setSelectedKnowledgeIndicators([]);
  }, [
    searchTerm,
    statusFilter,
    selectedTypes,
    selectedSubtypes,
    selectedRepositories,
    hideComputedTypes,
  ]);

  const runInProgress = isRunningAll || isRunning;
  const hasCodeKnowledgeIndicatorsError = Boolean(codeKnowledgeIndicatorsError);
  const hasCoverageError = Boolean(distribution.error);

  const features = useMemo(
    () => getFeaturesFromKIs(codeKnowledgeIndicators),
    [codeKnowledgeIndicators]
  );

  // Distribution of identified languages, derived from the code `language`
  // feature KIs (title carries the language value), sorted most-common first.
  const languageDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ki of codeKnowledgeIndicators) {
      if (ki.kind !== 'feature' || ki.feature.subtype !== 'language') continue;
      const language =
        ki.feature.title ??
        (typeof ki.feature.properties?.language === 'string'
          ? ki.feature.properties.language
          : undefined);
      if (!language) continue;
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
  }, [codeKnowledgeIndicators]);

  // Distribution of repository classifications, derived from the code
  // `repo_type` feature KIs (title carries the human-readable classification).
  const repositoryTypeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ki of codeKnowledgeIndicators) {
      if (ki.kind !== 'feature' || ki.feature.subtype !== 'repo_type') continue;
      const type =
        ki.feature.title ??
        (typeof ki.feature.properties?.repo_type === 'string'
          ? ki.feature.properties.repo_type
          : undefined);
      if (!type) continue;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }, [codeKnowledgeIndicators]);

  // Opens the details flyout for a service by name (used by the coverage badges),
  // matching the service `entity` KI the same way the table rows are keyed.
  const handleServiceNameClick = useCallback(
    (serviceName: string) => {
      const match = codeKnowledgeIndicators.find(
        (ki) =>
          ki.kind === 'feature' &&
          ki.feature.subtype === 'service' &&
          ((typeof ki.feature.properties?.name === 'string' &&
            ki.feature.properties.name === serviceName) ||
            ki.feature.title === serviceName)
      );
      if (match) {
        setSelectedKnowledgeIndicatorId(getKnowledgeIndicatorItemId(match));
      }
    },
    [codeKnowledgeIndicators]
  );

  const filterCriteria = useMemo(
    () => ({ statusFilter, selectedTypes, selectedSubtypes, hideComputedTypes }),
    [statusFilter, selectedTypes, selectedSubtypes, hideComputedTypes]
  );

  const filteredKnowledgeIndicators = useMemo(
    () =>
      codeKnowledgeIndicators.filter((ki) => {
        if (
          !matchesKnowledgeIndicatorFilters(ki, {
            ...filterCriteria,
            searchTerm: searchTerm.toLowerCase(),
          })
        ) {
          return false;
        }
        if (selectedRepositories.length > 0) {
          const repository = getKnowledgeIndicatorRepository(ki);
          if (!repository || !selectedRepositories.includes(repository)) {
            return false;
          }
        }
        return true;
      }),
    [codeKnowledgeIndicators, filterCriteria, searchTerm, selectedRepositories]
  );

  const runBulkFeatureOp = async (
    operation: typeof excludeFeaturesInBulk,
    successTitle: string,
    partialTitle: string,
    errorTitle: string
  ) => {
    const targetFeatures = selectedKnowledgeIndicators.flatMap((ki) =>
      ki.kind === 'feature' ? [ki.feature] : []
    );
    if (targetFeatures.length === 0) {
      return;
    }
    setIsBulkInProgress(true);
    try {
      const { failedCount, succeededCount } = await operation(targetFeatures);
      if (failedCount === 0) {
        toasts.addSuccess({ title: successTitle });
        setSelectedKnowledgeIndicators([]);
        setSelectedKnowledgeIndicatorId(undefined);
      } else if (succeededCount > 0) {
        toasts.addWarning({ title: partialTitle });
      } else {
        toasts.addError(new Error(BULK_OPERATION_REJECTED_ERROR), { title: errorTitle });
      }
    } catch (error) {
      toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: errorTitle,
      });
    } finally {
      setIsBulkInProgress(false);
      refetch();
    }
  };

  const selectionHasOnlyExcludableFeatures =
    selectedKnowledgeIndicators.length > 0 &&
    selectedKnowledgeIndicators.every(
      (ki) => ki.kind === 'feature' && !isComputedFeature(ki.feature)
    );
  const noSelection = selectedKnowledgeIndicators.length === 0;
  const selectedHasVirtualFeature = selectedKnowledgeIndicators.some(isCodeVirtualFeature);

  const selectedKnowledgeIndicator = useMemo(
    () =>
      codeKnowledgeIndicators.find(
        (ki) => getKnowledgeIndicatorItemId(ki) === selectedKnowledgeIndicatorId
      ),
    [codeKnowledgeIndicators, selectedKnowledgeIndicatorId]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<KnowledgeIndicator>>>(
    () => [
      {
        field: 'title' as keyof KnowledgeIndicator,
        name: TITLE_LABEL,
        sortable: (ki: KnowledgeIndicator) => getTitle(ki).toLowerCase(),
        render: (_: unknown, ki: KnowledgeIndicator) => {
          const isExpanded = selectedKnowledgeIndicatorId === getKnowledgeIndicatorItemId(ki);
          const toggle = () =>
            setSelectedKnowledgeIndicatorId(
              isExpanded ? undefined : getKnowledgeIndicatorItemId(ki)
            );
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={isExpanded ? MINIMIZE_LABEL : VIEW_DETAILS_LABEL}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType={isExpanded ? 'minimize' : 'expand'}
                    aria-label={isExpanded ? MINIMIZE_LABEL : VIEW_DETAILS_LABEL}
                    onClick={toggle}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink onClick={toggle}>{getTitle(ki)}</EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'type' as keyof KnowledgeIndicator,
        name: TYPE_LABEL,
        width: '192px',
        sortable: getTypeSortValue,
        render: (_: unknown, ki: KnowledgeIndicator) =>
          ki.kind === 'feature' ? (
            <EuiBadge color="hollow" css={capitalizeStyle}>
              {getFeatureTypeLabel(ki.feature.subtype, ki.feature.type)}
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">
              {ki.query.type === QUERY_TYPE_STATS ? STATS_QUERY_LABEL : MATCH_QUERY_LABEL}
            </EuiBadge>
          ),
      },
      {
        field: 'source' as keyof KnowledgeIndicator,
        name: SOURCE_LABEL,
        width: '130px',
        sortable: (ki: KnowledgeIndicator) => sourceDisplayKind(getKnowledgeIndicatorSource(ki)),
        render: (_: unknown, ki: KnowledgeIndicator) => (
          <KnowledgeIndicatorSourceBadge source={getKnowledgeIndicatorSource(ki)} />
        ),
      },
      {
        field: 'repository' as keyof KnowledgeIndicator,
        name: REPOSITORY_LABEL,
        width: '240px',
        sortable: (ki: KnowledgeIndicator) => getKnowledgeIndicatorRepository(ki) ?? '',
        render: (_: unknown, ki: KnowledgeIndicator) => {
          const repository = getKnowledgeIndicatorRepository(ki);
          return repository ? (
            <EuiBadge color="hollow">{repository}</EuiBadge>
          ) : (
            <EuiText size="s" color="subdued">
              {'—'}
            </EuiText>
          );
        },
      },
      ...(canManage
        ? [
            {
              name: ACTIONS_LABEL,
              width: '96px',
              align: 'right' as const,
              render: (ki: KnowledgeIndicator) =>
                isCodeVirtualFeature(ki) ? null : (
                  <KnowledgeIndicatorActionsCell
                    streamName={getKnowledgeIndicatorStreamName(ki)}
                    knowledgeIndicator={ki}
                    onDeleteRequest={(item) => setKnowledgeIndicatorsToDelete([item])}
                    onDataChanged={() => void refetch()}
                  />
                ),
            },
          ]
        : []),
    ],
    [canManage, refetch, selectedKnowledgeIndicatorId]
  );

  if (isAvailabilityLoading) {
    return <LoadingPanel size="xxl" />;
  }

  if (availabilityError) {
    return <CodeIntelligenceAvailabilityError onRetry={() => void refetchAvailability()} />;
  }

  if (!available) {
    return <CodeIntelligencePlaceholder message={availabilityMessage} />;
  }

  return (
    <>
      <EuiFlexGroup direction="column" css={{ flexGrow: 0 }} data-test-subj="codeIntelligenceTab">
        {canManage && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  iconType="trash"
                  isLoading={isResetting}
                  isDisabled={blocksActivity || isTruncated || runInProgress || isReconciling}
                  onClick={() => setIsResetModalOpen(true)}
                  title={blocksActivity ? activityBlockTooltip : undefined}
                >
                  {RESET_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="querySelector"
                  isLoading={isReconciling}
                  isDisabled={blocksActivity || runInProgress || isResetting}
                  onClick={() => reconcile()}
                  title={blocksActivity ? activityBlockTooltip : undefined}
                >
                  {RECONCILE_LABEL}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="play"
                  isLoading={runInProgress}
                  isDisabled={blocksActivity || isResetting || isReconciling}
                  onClick={() => runAll()}
                  title={blocksActivity ? activityBlockTooltip : undefined}
                >
                  {runInProgress ? RUN_ALL_IN_PROGRESS_LABEL : RUN_ALL_LABEL}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        {runStatusError && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={RUN_STATUS_ERROR_TITLE}
            >
              <p>{RUN_STATUS_ERROR_DESCRIPTION}</p>
              <EuiButton size="s" onClick={() => void refetchRunStatus()}>
                {RETRY_LABEL}
              </EuiButton>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        {hasCodeKnowledgeIndicatorsError && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={CODE_KNOWLEDGE_INDICATORS_ERROR_TITLE}
            >
              <p>{CODE_KNOWLEDGE_INDICATORS_ERROR_DESCRIPTION}</p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        {isTruncated && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              color="warning"
              iconType="warning"
              title={TRUNCATED_RESULTS_TITLE}
            >
              <p>{TRUNCATED_RESULTS_DESCRIPTION}</p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          {isLoading || distribution.isLoading ? (
            <LoadingPanel size="l" />
          ) : hasCoverageError || hasCodeKnowledgeIndicatorsError ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={CODE_COVERAGE_ERROR_TITLE}
            >
              <p>{CODE_COVERAGE_ERROR_DESCRIPTION}</p>
            </EuiCallOut>
          ) : (
            <EuiFlexGroup gutterSize="m" responsive={false} wrap>
              {distribution.isTruncated && (
                <EuiFlexItem grow={false}>
                  <EuiCallOut
                    announceOnMount
                    color="warning"
                    iconType="warning"
                    title={COVERAGE_TRUNCATED_TITLE}
                  >
                    <p>{COVERAGE_TRUNCATED_DESCRIPTION}</p>
                  </EuiCallOut>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <CodeIntelligenceServiceDistribution
                  codeOnly={distribution.codeOnly}
                  both={distribution.both}
                  logsOnly={distribution.logsOnly}
                  codeOnlyServices={distribution.codeOnlyServices}
                  onServiceClick={handleServiceNameClick}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <CodeIntelligenceLanguageDistribution languages={languageDistribution} />
              </EuiFlexItem>
              <EuiFlexItem>
                <CodeIntelligenceRepositoryTypeDistribution
                  repositoryTypes={repositoryTypeDistribution}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                aria-label={SEARCH_PLACEHOLDER}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <KnowledgeIndicatorsStatusFilter
                knowledgeIndicators={codeKnowledgeIndicators}
                searchTerm={searchTerm.toLowerCase()}
                selectedTypes={selectedTypes}
                selectedStreams={EMPTY_STREAMS}
                hideComputedTypes={hideComputedTypes}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <KnowledgeIndicatorsTypeFilter
                knowledgeIndicators={codeKnowledgeIndicators}
                searchTerm={searchTerm.toLowerCase()}
                statusFilter={statusFilter}
                selectedTypes={selectedTypes}
                onSelectedTypesChange={setSelectedTypes}
                hideComputedTypes={hideComputedTypes}
                selectedStreams={EMPTY_STREAMS}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <KnowledgeIndicatorsSubtypeFilter
                knowledgeIndicators={codeKnowledgeIndicators}
                searchTerm={searchTerm.toLowerCase()}
                statusFilter={statusFilter}
                selectedTypes={selectedTypes}
                selectedSubtypes={selectedSubtypes}
                onSelectedSubtypesChange={setSelectedSubtypes}
                hideComputedTypes={hideComputedTypes}
                selectedStreams={EMPTY_STREAMS}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RepositoryFilter
                knowledgeIndicators={codeKnowledgeIndicators}
                searchTerm={searchTerm.toLowerCase()}
                filterCriteria={filterCriteria}
                selectedRepositories={selectedRepositories}
                onSelectedRepositoriesChange={setSelectedRepositories}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={SHOW_COMPUTED_LABEL}
                checked={!hideComputedTypes}
                onChange={(e) => setHideComputedTypes(!e.target.checked)}
                compressed
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {SELECTED_COUNT_LABEL(
                  selectedKnowledgeIndicators.length,
                  filteredKnowledgeIndicators.length
                )}
              </EuiText>
            </EuiFlexItem>
            {canManage &&
              (statusFilter === 'active' ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="eyeClosed"
                    color="warning"
                    size="xs"
                    isLoading={isBulkInProgress}
                    isDisabled={blocksActivity || !selectionHasOnlyExcludableFeatures}
                    onClick={() =>
                      runBulkFeatureOp(
                        excludeFeaturesInBulk,
                        BULK_EXCLUDE_SUCCESS,
                        BULK_EXCLUDE_PARTIAL,
                        BULK_EXCLUDE_ERROR
                      )
                    }
                    title={blocksActivity ? activityBlockTooltip : undefined}
                  >
                    {EXCLUDE_SELECTED_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="eye"
                    size="xs"
                    isLoading={isBulkInProgress}
                    isDisabled={blocksActivity || !selectionHasOnlyExcludableFeatures}
                    onClick={() =>
                      runBulkFeatureOp(
                        restoreFeaturesInBulk,
                        BULK_RESTORE_SUCCESS,
                        BULK_RESTORE_PARTIAL,
                        BULK_RESTORE_ERROR
                      )
                    }
                    title={blocksActivity ? activityBlockTooltip : undefined}
                  >
                    {RESTORE_SELECTED_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            {canManage && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="trash"
                  color="danger"
                  size="xs"
                  isLoading={isDeleting}
                  isDisabled={blocksActivity || noSelection || selectedHasVirtualFeature}
                  onClick={() => setKnowledgeIndicatorsToDelete(selectedKnowledgeIndicators)}
                  title={blocksActivity ? activityBlockTooltip : undefined}
                >
                  {DELETE_SELECTED_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiInMemoryTable<KnowledgeIndicator>
            items={filteredKnowledgeIndicators}
            columns={columns}
            itemId={getKnowledgeIndicatorItemId}
            loading={isLoading}
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              pageSizeOptions: [25, 50, 100],
            }}
            onTableChange={handleTableChange}
            sorting={sorting}
            selection={
              canManage
                ? {
                    selected: selectedKnowledgeIndicators,
                    onSelectionChange: setSelectedKnowledgeIndicators,
                  }
                : undefined
            }
            tableCaption={TABLE_CAPTION}
            noItemsMessage={
              isLoading || hasCodeKnowledgeIndicatorsError ? undefined : NO_ITEMS_MESSAGE
            }
          />
          {selectedKnowledgeIndicator ? (
            <KnowledgeIndicatorDetailsFlyout
              knowledgeIndicator={selectedKnowledgeIndicator}
              occurrencesByQueryId={NO_OCCURRENCES}
              onClose={() => setSelectedKnowledgeIndicatorId(undefined)}
              features={features}
              canManage={canManage && !isCodeVirtualFeature(selectedKnowledgeIndicator)}
              onDataChanged={() => void refetch()}
            />
          ) : null}
          {canManage && knowledgeIndicatorsToDelete.length > 0 ? (
            <DeleteTableItemsModal
              title={DELETE_MODAL_TITLE(knowledgeIndicatorsToDelete.length)}
              items={knowledgeIndicatorsToDelete}
              onCancel={() => setKnowledgeIndicatorsToDelete([])}
              onConfirm={() => {
                void deleteKnowledgeIndicatorsInBulk(knowledgeIndicatorsToDelete).then(
                  () => setKnowledgeIndicatorsToDelete([]),
                  () => undefined
                );
              }}
              isLoading={isDeleting}
            />
          ) : null}
          {isResetModalOpen ? (
            <EuiConfirmModal
              title={RESET_MODAL_TITLE}
              aria-labelledby={resetModalTitleId}
              titleProps={{ id: resetModalTitleId }}
              onCancel={() => setIsResetModalOpen(false)}
              onConfirm={() => {
                setIsResetModalOpen(false);
                reset();
              }}
              cancelButtonText={RESET_MODAL_CANCEL}
              confirmButtonText={RESET_MODAL_CONFIRM}
              buttonColor="danger"
            >
              <EuiText size="s">{RESET_MODAL_BODY}</EuiText>
            </EuiConfirmModal>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

const TITLE_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.columns.title', {
  defaultMessage: 'Title',
});
const TYPE_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.columns.type', {
  defaultMessage: 'Type',
});
const SOURCE_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.columns.source', {
  defaultMessage: 'Source',
});
const REPOSITORY_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.columns.repository',
  {
    defaultMessage: 'Repository',
  }
);
const ACTIONS_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.columns.actions',
  {
    defaultMessage: 'Actions',
  }
);
const FEATURE_TYPE_SERVICE_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.type.service',
  {
    defaultMessage: 'Service',
  }
);
const FEATURE_TYPE_LANGUAGE_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.type.language',
  { defaultMessage: 'Language' }
);
const FEATURE_TYPE_REPO_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.type.repoType',
  {
    defaultMessage: 'Repository type',
  }
);
const MATCH_QUERY_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.matchQuery', {
  defaultMessage: 'Match query',
});
const STATS_QUERY_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.statsQuery', {
  defaultMessage: 'Stats query',
});
const VIEW_DETAILS_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.viewDetails',
  {
    defaultMessage: 'View details',
  }
);
const MINIMIZE_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.minimizeDetails',
  {
    defaultMessage: 'Minimize details',
  }
);
const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.searchPlaceholder',
  {
    defaultMessage: 'Search code knowledge indicators',
  }
);
const SHOW_COMPUTED_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.showComputed',
  {
    defaultMessage: 'Show computed',
  }
);
const EXCLUDE_SELECTED_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.excludeSelected',
  {
    defaultMessage: 'Exclude',
  }
);
const RESTORE_SELECTED_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.restoreSelected',
  {
    defaultMessage: 'Restore',
  }
);
const DELETE_SELECTED_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.deleteSelected',
  {
    defaultMessage: 'Delete',
  }
);
const BULK_EXCLUDE_SUCCESS = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.bulkExcludeSuccess',
  {
    defaultMessage: 'Excluded selected features',
  }
);
const BULK_EXCLUDE_PARTIAL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.bulkExcludePartial',
  { defaultMessage: 'Some selected features could not be excluded' }
);
const BULK_EXCLUDE_ERROR = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.bulkExcludeError',
  {
    defaultMessage: 'Failed to exclude selected features',
  }
);
const BULK_RESTORE_SUCCESS = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.bulkRestoreSuccess',
  {
    defaultMessage: 'Restored selected features',
  }
);
const BULK_RESTORE_PARTIAL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.bulkRestorePartial',
  { defaultMessage: 'Some selected features could not be restored' }
);
const BULK_RESTORE_ERROR = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.bulkRestoreError',
  {
    defaultMessage: 'Failed to restore selected features',
  }
);
const SELECTED_COUNT_LABEL = (selected: number, total: number) =>
  i18n.translate('xpack.significantEventsApp.codeIntelligence.selectedCount', {
    defaultMessage: '{selected} of {total} selected',
    values: { selected, total },
  });
const TRUNCATED_RESULTS_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.truncatedResultsTitle',
  { defaultMessage: 'Code Intelligence results are incomplete' }
);
const TRUNCATED_RESULTS_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.truncatedResultsDescription',
  {
    defaultMessage:
      'The bounded feature or query scan reached its limit, so these results may be incomplete. Delete code features is unavailable until the source result is smaller.',
  }
);
const RUN_STATUS_ERROR_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runStatusErrorTitle',
  { defaultMessage: 'Could not refresh Code Intelligence run status' }
);
const RUN_STATUS_ERROR_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runStatusErrorDescription',
  { defaultMessage: 'The run may still be active. Retry to refresh its status.' }
);
const RETRY_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.retryLabel', {
  defaultMessage: 'Retry',
});
const CODE_KNOWLEDGE_INDICATORS_ERROR_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.knowledgeIndicatorsErrorTitle',
  { defaultMessage: 'Could not load code knowledge indicators' }
);
const CODE_KNOWLEDGE_INDICATORS_ERROR_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.knowledgeIndicatorsErrorDescription',
  { defaultMessage: 'Retry after the connection to Code Intelligence is restored.' }
);
const CODE_COVERAGE_ERROR_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.coverageErrorTitle',
  { defaultMessage: 'Could not load Code Intelligence coverage' }
);
const CODE_COVERAGE_ERROR_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.coverageErrorDescription',
  { defaultMessage: 'Coverage is unavailable until the request succeeds.' }
);
const COVERAGE_TRUNCATED_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.coverageTruncatedTitle',
  { defaultMessage: 'Coverage may be incomplete' }
);
const COVERAGE_TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.coverageTruncatedDescription',
  { defaultMessage: 'The bounded service scan reached its limit.' }
);

const NO_ITEMS_MESSAGE = i18n.translate('xpack.significantEventsApp.codeIntelligence.noItems', {
  defaultMessage:
    'No code knowledge indicators yet. Run "Identify features & queries" to generate them.',
});
const TABLE_CAPTION = i18n.translate('xpack.significantEventsApp.codeIntelligence.tableCaption', {
  defaultMessage: 'Code-derived knowledge indicators',
});
const RUN_ALL_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.runAll', {
  defaultMessage: 'Identify features & queries',
});
const RUN_ALL_IN_PROGRESS_LABEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runAllRunning',
  {
    defaultMessage: 'Identifying…',
  }
);
const RECONCILE_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.reconcile', {
  defaultMessage: 'Reconcile KIs',
});
const RESET_LABEL = i18n.translate('xpack.significantEventsApp.codeIntelligence.reset', {
  defaultMessage: 'Delete code features',
});
const RESET_MODAL_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.resetModalTitle',
  {
    defaultMessage: 'Delete all code features?',
  }
);
const RESET_MODAL_BODY = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.resetModalBody',
  {
    defaultMessage:
      'This removes every code-derived feature across all streams so the next run re-derives them from scratch. Log-derived knowledge indicators and queries are not affected.',
  }
);
const RESET_MODAL_CONFIRM = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.resetModalConfirm',
  {
    defaultMessage: 'Delete code features',
  }
);
const RESET_MODAL_CANCEL = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.resetModalCancel',
  {
    defaultMessage: 'Cancel',
  }
);
const BULK_OPERATION_REJECTED_ERROR = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.bulkOperationRejectedError',
  { defaultMessage: 'No selected features could be updated' }
);

const DELETE_MODAL_TITLE = (count: number) =>
  i18n.translate('xpack.significantEventsApp.codeIntelligence.deleteModalTitle', {
    defaultMessage:
      'Delete {count, plural, one {# knowledge indicator} other {# knowledge indicators}}?',
    values: { count },
  });
