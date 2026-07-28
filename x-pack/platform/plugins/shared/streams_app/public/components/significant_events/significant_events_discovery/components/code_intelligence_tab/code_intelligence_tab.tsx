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
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingPanel } from '../../../../loading_panel';
import { useCodeIntelligenceAvailability } from '../../../../../hooks/significant_events/use_code_intelligence_availability';
import { useCodeIntelligenceRun } from '../../../../../hooks/significant_events/use_code_intelligence_run';
import { useCodeIntelligenceRunStatus } from '../../../../../hooks/significant_events/use_code_intelligence_run_status';
import { useFetchCodeKnowledgeIndicators } from '../../../../../hooks/significant_events/use_fetch_code_knowledge_indicators';
import { useCodeIntelligenceServiceDistribution } from '../../../../../hooks/significant_events/use_code_intelligence_service_distribution';
import { useKnowledgeIndicatorsBulkDelete } from '../../../../../hooks/significant_events/use_knowledge_indicators_bulk_delete';
import { useDiscoveryFeaturesApi } from '../../../../../hooks/significant_events/use_discovery_features_api';
import { useKibana } from '../../../../../hooks/use_kibana';
import { CodeIntelligencePlaceholder } from '../../../stream_detail_significant_events_view/code_insights_panel';
import { CodeIntelligenceServiceDistribution } from './code_intelligence_service_distribution';
import { CodeIntelligenceLanguageDistribution } from './code_intelligence_language_distribution';
import { CodeIntelligenceRepositoryTypeDistribution } from './code_intelligence_repository_type_distribution';
import { RepositoryFilter } from './repository_filter';
import { KnowledgeIndicatorActionsCell } from '../../../stream_detail_significant_events_view/knowledge_indicator_actions_cell';
import { KnowledgeIndicatorDetailsFlyout } from '../../../stream_detail_significant_events_view/knowledge_indicator_details_flyout';
import { KnowledgeIndicatorSourceBadge } from '../../../stream_detail_significant_events_view/knowledge_indicator_source_badge';
import { KnowledgeIndicatorsStatusFilter } from '../../../stream_detail_significant_events_view/knowledge_indicators_status_filter';
import { KnowledgeIndicatorsTypeFilter } from '../../../stream_detail_significant_events_view/knowledge_indicators_type_filter';
import { KnowledgeIndicatorsSubtypeFilter } from '../../../stream_detail_significant_events_view/knowledge_indicators_subtype_filter';
import { DeleteTableItemsModal } from '../../../stream_detail_significant_events_view/delete_table_items_modal';
import { getFeaturesFromKIs } from '../../../stream_detail_significant_events_view/utils/get_features_from_kis';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import {
  getKnowledgeIndicatorSource,
  sourceDisplayKind,
} from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_source';
import { getKnowledgeIndicatorStreamName } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_stream_name';
import { getKnowledgeIndicatorRepository } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_repository';
import { matchesKnowledgeIndicatorFilters } from '../../../stream_detail_significant_events_view/utils/matches_knowledge_indicator_filters';

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

export function CodeIntelligenceTab() {
  const { available, isLoading: isAvailabilityLoading } = useCodeIntelligenceAvailability();
  const {
    knowledgeIndicators: codeKnowledgeIndicators,
    isLoading,
    refetch,
  } = useFetchCodeKnowledgeIndicators({ enabled: available });
  const { runAll, isRunningAll, reset, isResetting, reconcile, isReconciling } =
    useCodeIntelligenceRun();
  const { isRunning } = useCodeIntelligenceRunStatus({ enabled: available });
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

  // Reset to the first page whenever the active filters change so the table
  // never lands on a now-empty page (which otherwise renders as "0 rows").
  useEffect(() => {
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
  }, [
    searchTerm,
    statusFilter,
    selectedTypes,
    selectedSubtypes,
    selectedRepositories,
    hideComputedTypes,
  ]);

  const runInProgress = isRunningAll || isRunning;

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
    errorTitle: string
  ) => {
    const targetFeatures = selectedKnowledgeIndicators
      .filter((ki) => ki.kind === 'feature')
      .map((ki) => ki.feature);
    if (targetFeatures.length === 0) {
      return;
    }
    setIsBulkInProgress(true);
    try {
      await operation(targetFeatures);
      toasts.addSuccess({ title: successTitle });
      setSelectedKnowledgeIndicators([]);
      setSelectedKnowledgeIndicatorId(undefined);
    } catch (error) {
      toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: errorTitle,
      });
    } finally {
      setIsBulkInProgress(false);
      refetch();
    }
  };

  const selectionHasFeatures = selectedKnowledgeIndicators.some((ki) => ki.kind === 'feature');
  const noSelection = selectedKnowledgeIndicators.length === 0;

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
      {
        name: ACTIONS_LABEL,
        width: '96px',
        align: 'right',
        render: (ki: KnowledgeIndicator) => (
          <KnowledgeIndicatorActionsCell
            streamName={getKnowledgeIndicatorStreamName(ki)}
            knowledgeIndicator={ki}
            onDeleteRequest={(item) => setKnowledgeIndicatorsToDelete([item])}
          />
        ),
      },
    ],
    [selectedKnowledgeIndicatorId]
  );

  if (isAvailabilityLoading) {
    return <LoadingPanel size="xxl" />;
  }

  if (!available) {
    return <CodeIntelligencePlaceholder />;
  }

  return (
    <>
      <EuiFlexGroup direction="column" css={{ flexGrow: 0 }}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="danger"
                iconType="trash"
                isLoading={isResetting}
                isDisabled={runInProgress || isReconciling}
                onClick={() => setIsResetModalOpen(true)}
              >
                {RESET_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="querySelector"
                isLoading={isReconciling}
                isDisabled={runInProgress || isResetting}
                onClick={() => reconcile()}
              >
                {RECONCILE_LABEL}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="play"
                isLoading={runInProgress}
                isDisabled={isResetting || isReconciling}
                onClick={() => runAll()}
              >
                {runInProgress ? RUN_ALL_IN_PROGRESS_LABEL : RUN_ALL_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
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
            {statusFilter === 'active' ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="eyeClosed"
                  color="warning"
                  size="xs"
                  isLoading={isBulkInProgress}
                  isDisabled={!selectionHasFeatures}
                  onClick={() =>
                    runBulkFeatureOp(
                      excludeFeaturesInBulk,
                      BULK_EXCLUDE_SUCCESS,
                      BULK_EXCLUDE_ERROR
                    )
                  }
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
                  isDisabled={!selectionHasFeatures}
                  onClick={() =>
                    runBulkFeatureOp(
                      restoreFeaturesInBulk,
                      BULK_RESTORE_SUCCESS,
                      BULK_RESTORE_ERROR
                    )
                  }
                >
                  {RESTORE_SELECTED_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="trash"
                color="danger"
                size="xs"
                isLoading={isDeleting}
                isDisabled={noSelection}
                onClick={() => setKnowledgeIndicatorsToDelete(selectedKnowledgeIndicators)}
              >
                {DELETE_SELECTED_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
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
            selection={{
              selected: selectedKnowledgeIndicators,
              onSelectionChange: setSelectedKnowledgeIndicators,
            }}
            tableCaption={TABLE_CAPTION}
            noItemsMessage={isLoading ? undefined : NO_ITEMS_MESSAGE}
          />
          {selectedKnowledgeIndicator ? (
            <KnowledgeIndicatorDetailsFlyout
              knowledgeIndicator={selectedKnowledgeIndicator}
              occurrencesByQueryId={NO_OCCURRENCES}
              onClose={() => setSelectedKnowledgeIndicatorId(undefined)}
              features={features}
            />
          ) : null}
          {knowledgeIndicatorsToDelete.length > 0 ? (
            <DeleteTableItemsModal
              title={DELETE_MODAL_TITLE(knowledgeIndicatorsToDelete.length)}
              items={knowledgeIndicatorsToDelete}
              onCancel={() => setKnowledgeIndicatorsToDelete([])}
              onConfirm={() => {
                void deleteKnowledgeIndicatorsInBulk(knowledgeIndicatorsToDelete).then(() => {
                  setKnowledgeIndicatorsToDelete([]);
                });
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

const TITLE_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.title', {
  defaultMessage: 'Title',
});
const TYPE_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.type', {
  defaultMessage: 'Type',
});
const SOURCE_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.source', {
  defaultMessage: 'Source',
});
const REPOSITORY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.repository', {
  defaultMessage: 'Repository',
});
const ACTIONS_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.columns.actions', {
  defaultMessage: 'Actions',
});
const FEATURE_TYPE_SERVICE_LABEL = i18n.translate(
  'xpack.streams.codeIntelligenceTab.type.service',
  {
    defaultMessage: 'Service',
  }
);
const FEATURE_TYPE_LANGUAGE_LABEL = i18n.translate(
  'xpack.streams.codeIntelligenceTab.type.language',
  { defaultMessage: 'Language' }
);
const FEATURE_TYPE_REPO_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.type.repoType', {
  defaultMessage: 'Repository type',
});
const MATCH_QUERY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.matchQuery', {
  defaultMessage: 'Match query',
});
const STATS_QUERY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.statsQuery', {
  defaultMessage: 'Stats query',
});
const VIEW_DETAILS_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.viewDetails', {
  defaultMessage: 'View details',
});
const MINIMIZE_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.minimizeDetails', {
  defaultMessage: 'Minimize details',
});
const SEARCH_PLACEHOLDER = i18n.translate('xpack.streams.codeIntelligenceTab.searchPlaceholder', {
  defaultMessage: 'Search code knowledge indicators',
});
const SHOW_COMPUTED_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.showComputed', {
  defaultMessage: 'Show computed',
});
const EXCLUDE_SELECTED_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.excludeSelected', {
  defaultMessage: 'Exclude',
});
const RESTORE_SELECTED_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.restoreSelected', {
  defaultMessage: 'Restore',
});
const DELETE_SELECTED_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.deleteSelected', {
  defaultMessage: 'Delete',
});
const BULK_EXCLUDE_SUCCESS = i18n.translate(
  'xpack.streams.codeIntelligenceTab.bulkExcludeSuccess',
  {
    defaultMessage: 'Excluded selected features',
  }
);
const BULK_EXCLUDE_ERROR = i18n.translate('xpack.streams.codeIntelligenceTab.bulkExcludeError', {
  defaultMessage: 'Failed to exclude selected features',
});
const BULK_RESTORE_SUCCESS = i18n.translate(
  'xpack.streams.codeIntelligenceTab.bulkRestoreSuccess',
  {
    defaultMessage: 'Restored selected features',
  }
);
const BULK_RESTORE_ERROR = i18n.translate('xpack.streams.codeIntelligenceTab.bulkRestoreError', {
  defaultMessage: 'Failed to restore selected features',
});
const SELECTED_COUNT_LABEL = (selected: number, total: number) =>
  i18n.translate('xpack.streams.codeIntelligenceTab.selectedCount', {
    defaultMessage: '{selected} of {total} selected',
    values: { selected, total },
  });
const NO_ITEMS_MESSAGE = i18n.translate('xpack.streams.codeIntelligenceTab.noItems', {
  defaultMessage:
    'No code knowledge indicators yet. Run "Identify features & queries" to generate them.',
});
const TABLE_CAPTION = i18n.translate('xpack.streams.codeIntelligenceTab.tableCaption', {
  defaultMessage: 'Code-derived knowledge indicators',
});
const RUN_ALL_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.runAll', {
  defaultMessage: 'Identify features & queries',
});
const RUN_ALL_IN_PROGRESS_LABEL = i18n.translate(
  'xpack.streams.codeIntelligenceTab.runAllRunning',
  {
    defaultMessage: 'Identifying…',
  }
);
const RECONCILE_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.reconcile', {
  defaultMessage: 'Reconcile KIs',
});
const RESET_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.reset', {
  defaultMessage: 'Delete code features',
});
const RESET_MODAL_TITLE = i18n.translate('xpack.streams.codeIntelligenceTab.resetModalTitle', {
  defaultMessage: 'Delete all code features?',
});
const RESET_MODAL_BODY = i18n.translate('xpack.streams.codeIntelligenceTab.resetModalBody', {
  defaultMessage:
    'This removes every code-derived feature across all streams so the next run re-derives them from scratch. Log-derived knowledge indicators and queries are not affected.',
});
const RESET_MODAL_CONFIRM = i18n.translate('xpack.streams.codeIntelligenceTab.resetModalConfirm', {
  defaultMessage: 'Delete code features',
});
const RESET_MODAL_CANCEL = i18n.translate('xpack.streams.codeIntelligenceTab.resetModalCancel', {
  defaultMessage: 'Cancel',
});
const DELETE_MODAL_TITLE = (count: number) =>
  i18n.translate('xpack.streams.codeIntelligenceTab.deleteModalTitle', {
    defaultMessage:
      'Delete {count, plural, one {# knowledge indicator} other {# knowledge indicators}}?',
    values: { count },
  });
