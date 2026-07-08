/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import React, { useMemo, useState } from 'react';
import { LoadingPanel } from '../../../../loading_panel';
import { useCodeIntelligenceAvailability } from '../../../../../hooks/significant_events/use_code_intelligence_availability';
import { useCodeIntelligenceRun } from '../../../../../hooks/significant_events/use_code_intelligence_run';
import { useCodeIntelligenceRunStatus } from '../../../../../hooks/significant_events/use_code_intelligence_run_status';
import { useFetchCodeKnowledgeIndicators } from '../../../../../hooks/significant_events/use_fetch_code_knowledge_indicators';
import { useCodeIntelligenceServiceDistribution } from '../../../../../hooks/significant_events/use_code_intelligence_service_distribution';
import { useKnowledgeIndicatorsBulkDelete } from '../../../../../hooks/significant_events/use_knowledge_indicators_bulk_delete';
import { CodeIntelligencePlaceholder } from '../../../stream_detail_significant_events_view/code_insights_panel';
import { CodeIntelligenceServiceDistribution } from './code_intelligence_service_distribution';
import { KnowledgeIndicatorActionsCell } from '../../../stream_detail_significant_events_view/knowledge_indicator_actions_cell';
import { KnowledgeIndicatorDetailsFlyout } from '../../../stream_detail_significant_events_view/knowledge_indicator_details_flyout';
import { KnowledgeIndicatorSourceBadge } from '../../../stream_detail_significant_events_view/knowledge_indicator_source_badge';
import { DeleteTableItemsModal } from '../../../stream_detail_significant_events_view/delete_table_items_modal';
import { getFeaturesFromKIs } from '../../../stream_detail_significant_events_view/utils/get_features_from_kis';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import { getKnowledgeIndicatorSource } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_source';
import { getKnowledgeIndicatorStreamName } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_stream_name';
import { getKnowledgeIndicatorRepository } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_repository';

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

const NO_OCCURRENCES: Record<string, Array<{ x: number; y: number }>> = {};

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
    onSuccess: refetch,
  });

  const [selectedKnowledgeIndicatorId, setSelectedKnowledgeIndicatorId] = useState<
    string | undefined
  >(undefined);
  const [knowledgeIndicatorsToDelete, setKnowledgeIndicatorsToDelete] = useState<
    KnowledgeIndicator[]
  >([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const resetModalTitleId = useGeneratedHtmlId();

  const runInProgress = isRunningAll || isRunning;

  const features = useMemo(
    () => getFeaturesFromKIs(codeKnowledgeIndicators),
    [codeKnowledgeIndicators]
  );

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
        name: TITLE_LABEL,
        render: (ki: KnowledgeIndicator) => {
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
        name: TYPE_LABEL,
        width: '192px',
        render: (ki: KnowledgeIndicator) =>
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
        name: SOURCE_LABEL,
        width: '130px',
        render: (ki: KnowledgeIndicator) => (
          <KnowledgeIndicatorSourceBadge source={getKnowledgeIndicatorSource(ki)} />
        ),
      },
      {
        name: REPOSITORY_LABEL,
        width: '240px',
        render: (ki: KnowledgeIndicator) => {
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
      <CodeIntelligenceServiceDistribution
        codeOnly={distribution.codeOnly}
        both={distribution.both}
        logsOnly={distribution.logsOnly}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup
        justifyContent="flexEnd"
        alignItems="center"
        gutterSize="s"
        css={{ flexGrow: 0 }}
      >
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
      <EuiSpacer size="m" />
      <EuiInMemoryTable<KnowledgeIndicator>
        items={codeKnowledgeIndicators}
        columns={columns}
        itemId={getKnowledgeIndicatorItemId}
        loading={isLoading}
        pagination={{ pageSizeOptions: [25, 50, 100] }}
        search={{ box: { incremental: true, placeholder: SEARCH_PLACEHOLDER } }}
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
