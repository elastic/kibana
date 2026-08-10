/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiPagination,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import type { Streams } from '@kbn/streams-schema';
import { isComputedFeature, QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import type { Feature } from '@kbn/significant-events-schema';
import { upperFirst } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { buildFeatureDiscoverParams } from '../../../pages/significant_events/utils/discover_helpers';
import { getKnowledgeIndicatorTitle } from '../utils/get_knowledge_indicator_title';
import { getConfidenceColor } from '../utils/get_confidence_color';
import { FlyoutMetadataCard } from '../../flyout_components/flyout_metadata_card';
import { FlyoutToolbarHeader } from '../../flyout_components/flyout_toolbar_header';
import { SeverityBadge } from '../../../pages/significant_events/components/severity_badge/severity_badge';
import { useStreamKnowledgeIndicatorsBulkDelete } from '../hooks/use_stream_knowledge_indicators_bulk_delete';
import { useRulesDemote } from '../hooks/use_rules_demote';
import {
  useKnowledgeIndicatorActions,
  DELETE_LABEL,
  EXCLUDE_LABEL,
  RESTORE_LABEL,
  PROMOTE_LABEL,
} from '../hooks/use_knowledge_indicator_actions';
import { useBlocksNewActivity } from '../../../hooks/use_significant_events_maintenance';
import { STATS_PROMOTE_DISABLED_TOOLTIP } from '../../../pages/significant_events/components/queries_table/translations';
import { DeleteTableItemsModal } from '../delete_table_items_modal';
import { getKnowledgeIndicatorStreamName } from '../utils/get_knowledge_indicator_stream_name';
import { KnowledgeIndicatorFeatureDetailsContent } from './knowledge_indicator_feature_details_content';
import { KnowledgeIndicatorQueryDetailsContent } from './knowledge_indicator_query_details_content';

interface Props {
  knowledgeIndicator: KnowledgeIndicator;
  occurrencesByQueryId: Record<string, Array<{ x: number; y: number }>>;
  onClose: () => void;
  features: Feature[];
  stream?: Streams.all.Definition;
  pageIndex?: number;
  pageCount?: number;
  onSelectPage?: (pageIndex: number) => void;
}

export function KnowledgeIndicatorDetailsFlyout({
  knowledgeIndicator,
  occurrencesByQueryId,
  onClose,
  features,
  stream,
  pageIndex,
  pageCount,
  onSelectPage,
}: Props) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const { timeState } = useTimefilter();
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'knowledgeIndicatorDetailsFlyoutTitle' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const streamName = getKnowledgeIndicatorStreamName(knowledgeIndicator);

  const featureFilter =
    knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature.filter : undefined;
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const openFeatureInDiscover = useMemo(() => {
    if (!featureFilter || !discoverLocator || !stream) {
      return undefined;
    }
    return () =>
      discoverLocator.navigate(buildFeatureDiscoverParams(stream, featureFilter, timeState));
  }, [discoverLocator, featureFilter, stream, timeState]);

  const streamFeatures = useMemo(
    () => features.filter((f) => f.stream_name === streamName),
    [features, streamName]
  );

  const {
    excludeFeature,
    restoreFeature,
    promoteQuery,
    isMutating: isActionMutating,
  } = useKnowledgeIndicatorActions({ streamName, onSuccess: onClose });
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();

  const { deleteKnowledgeIndicatorsInBulk, isDeleting: isKIDeleting } =
    useStreamKnowledgeIndicatorsBulkDelete({ streamName, onSuccess: onClose });

  const { demoteRules, isPending: isDemoting } = useRulesDemote({ onSuccess: onClose });

  const isDeleting = isKIDeleting || isDemoting;
  const isMutating = isActionMutating || isDeleting;

  const isRule = knowledgeIndicator.kind === 'query' && knowledgeIndicator.rule.backed;

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteModal(false);
    if (knowledgeIndicator.kind === 'query' && knowledgeIndicator.rule.backed) {
      await demoteRules([knowledgeIndicator.query.id]);
    } else {
      await deleteKnowledgeIndicatorsInBulk([knowledgeIndicator]);
    }
  }, [knowledgeIndicator, demoteRules, deleteKnowledgeIndicatorsInBulk]);

  const openInDiscoverActionItems = useMemo(() => {
    if (!openFeatureInDiscover) {
      return [];
    }

    return [
      <EuiContextMenuItem
        key="open-in-discover"
        icon="discoverApp"
        onClick={() => {
          setIsActionsMenuOpen(false);
          openFeatureInDiscover();
        }}
      >
        {OPEN_IN_DISCOVER_LABEL}
      </EuiContextMenuItem>,
    ];
  }, [openFeatureInDiscover]);

  const featureActionItems = useMemo(() => {
    if (knowledgeIndicator.kind !== 'feature') {
      return [];
    }

    const items: React.ReactElement[] = [];
    const computed = isComputedFeature(knowledgeIndicator.feature);

    if (!computed) {
      if (knowledgeIndicator.feature.excluded) {
        items.push(
          <EuiContextMenuItem
            key="feature-restore"
            icon="eye"
            disabled={isMutating}
            onClick={() => {
              setIsActionsMenuOpen(false);
              restoreFeature(knowledgeIndicator.feature.uuid);
            }}
          >
            {RESTORE_LABEL}
          </EuiContextMenuItem>
        );
      } else {
        items.push(
          <EuiContextMenuItem
            key="feature-exclude"
            icon="eyeClosed"
            disabled={isMutating}
            onClick={() => {
              setIsActionsMenuOpen(false);
              excludeFeature(knowledgeIndicator.feature.uuid);
            }}
          >
            {EXCLUDE_LABEL}
          </EuiContextMenuItem>
        );
      }
    }

    items.push(
      <EuiContextMenuItem
        key="feature-delete"
        icon="trash"
        color="danger"
        disabled={isMutating}
        onClick={() => {
          setIsActionsMenuOpen(false);
          setShowDeleteModal(true);
        }}
      >
        {DELETE_LABEL}
      </EuiContextMenuItem>
    );

    return items;
  }, [excludeFeature, isMutating, knowledgeIndicator, restoreFeature]);

  const queryActionItems = useMemo(() => {
    if (knowledgeIndicator.kind !== 'query') {
      return [];
    }

    const isStats = knowledgeIndicator.query.type === QUERY_TYPE_STATS;
    const isPromoteDisabled = isMutating || blocksActivity || isStats;
    const promoteTooltip =
      activityBlockTooltip ?? (isStats ? STATS_PROMOTE_DISABLED_TOOLTIP : undefined);

    return [
      ...(!knowledgeIndicator.rule.backed
        ? [
            <EuiContextMenuItem
              key="query-promote"
              icon="plusCircle"
              disabled={isPromoteDisabled}
              toolTipContent={promoteTooltip}
              onClick={() => {
                setIsActionsMenuOpen(false);
                promoteQuery(knowledgeIndicator.query.id);
              }}
            >
              {PROMOTE_LABEL}
            </EuiContextMenuItem>,
          ]
        : []),
      <EuiContextMenuItem
        key="query-delete"
        icon="trash"
        color="danger"
        disabled={isMutating}
        onClick={() => {
          setIsActionsMenuOpen(false);
          setShowDeleteModal(true);
        }}
      >
        {DELETE_LABEL}
      </EuiContextMenuItem>,
    ];
  }, [activityBlockTooltip, blocksActivity, isMutating, knowledgeIndicator, promoteQuery]);

  const title = getKnowledgeIndicatorTitle(knowledgeIndicator);

  const hasPagination =
    pageCount !== undefined &&
    pageCount > 1 &&
    pageIndex !== undefined &&
    pageIndex >= 0 &&
    onSelectPage !== undefined;

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={flyoutTitleId}
        type="push"
        ownFocus={false}
        size="40%"
        hideCloseButton
      >
        <FlyoutToolbarHeader
          leftContent={
            hasPagination ? (
              <EuiFlexItem grow={false}>
                <EuiPagination
                  aria-label={PAGINATION_ARIA_LABEL}
                  pageCount={pageCount}
                  activePage={pageIndex}
                  onPageClick={onSelectPage}
                  compressed
                />
              </EuiFlexItem>
            ) : undefined
          }
        >
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={ACTIONS_MENU_POPOVER_ARIA_LABEL}
              button={
                <EuiToolTip content={ACTIONS_MENU_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="boxesVertical"
                    aria-label={ACTIONS_MENU_BUTTON_ARIA_LABEL}
                    isLoading={isMutating}
                    isDisabled={isMutating}
                    onClick={() => setIsActionsMenuOpen((open) => !open)}
                  />
                </EuiToolTip>
              }
              isOpen={isActionsMenuOpen}
              closePopover={() => setIsActionsMenuOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel
                items={[...openInDiscoverActionItems, ...featureActionItems, ...queryActionItems]}
              />
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={CLOSE_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                aria-label={CLOSE_BUTTON_ARIA_LABEL}
                onClick={onClose}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </FlyoutToolbarHeader>

        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={flyoutTitleId}>{title}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            {knowledgeIndicator.kind === 'feature' ? (
              <>
                <EuiFlexItem>
                  <FlyoutMetadataCard title={CONFIDENCE_LABEL}>
                    <EuiHealth color={getConfidenceColor(knowledgeIndicator.feature.confidence)}>
                      {knowledgeIndicator.feature.confidence}
                    </EuiHealth>
                  </FlyoutMetadataCard>
                </EuiFlexItem>
                <EuiFlexItem>
                  <FlyoutMetadataCard title={TYPE_LABEL}>
                    <EuiBadge color="hollow">
                      {upperFirst(knowledgeIndicator.feature.type)}
                    </EuiBadge>
                  </FlyoutMetadataCard>
                </EuiFlexItem>
              </>
            ) : (
              <>
                <EuiFlexItem>
                  <FlyoutMetadataCard title={SEVERITY_LABEL}>
                    <SeverityBadge score={knowledgeIndicator.query.severity_score} />
                  </FlyoutMetadataCard>
                </EuiFlexItem>
                <EuiFlexItem>
                  <FlyoutMetadataCard title={TYPE_LABEL}>
                    <EuiBadge color="hollow">{QUERY_TYPE_LABEL}</EuiBadge>
                  </FlyoutMetadataCard>
                </EuiFlexItem>
              </>
            )}
            <EuiFlexItem>
              <FlyoutMetadataCard title={STREAM_LABEL}>
                <EuiBadge color="hollow" iconType="productStreamsClassic" iconSide="left">
                  {streamName}
                </EuiBadge>
              </FlyoutMetadataCard>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {knowledgeIndicator.kind === 'feature' ? (
            <KnowledgeIndicatorFeatureDetailsContent
              feature={knowledgeIndicator.feature}
              onOpenInDiscover={openFeatureInDiscover}
            />
          ) : (
            <KnowledgeIndicatorQueryDetailsContent
              query={knowledgeIndicator.query}
              occurrences={occurrencesByQueryId[knowledgeIndicator.query.id]}
              streamFeatures={streamFeatures}
            />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
      {showDeleteModal ? (
        <DeleteTableItemsModal
          title={isRule ? DELETE_RULE_MODAL_TITLE : DELETE_KI_MODAL_TITLE}
          items={[knowledgeIndicator]}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      ) : null}
    </>
  );
}

const CLOSE_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.closeButtonAriaLabel',
  {
    defaultMessage: 'Close',
  }
);

const PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.paginationAriaLabel',
  {
    defaultMessage: 'Knowledge indicator pagination',
  }
);

const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.openInDiscoverActionLabel',
  {
    defaultMessage: 'Open in Discover',
  }
);

const CONFIDENCE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.confidenceLabel',
  { defaultMessage: 'Confidence' }
);

const TYPE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.typeLabel',
  {
    defaultMessage: 'Type',
  }
);

const STREAM_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.streamLabel',
  {
    defaultMessage: 'Stream',
  }
);

const SEVERITY_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.severityLabel',
  { defaultMessage: 'Severity' }
);

const QUERY_TYPE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.queryTypeLabel',
  { defaultMessage: 'Query' }
);

const ACTIONS_MENU_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.actionsMenuButtonAriaLabel',
  {
    defaultMessage: 'Actions',
  }
);

const ACTIONS_MENU_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.actionsMenuPopoverAriaLabel',
  {
    defaultMessage: 'Actions menu',
  }
);

const DELETE_KI_MODAL_TITLE = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.deleteKIModalTitle',
  {
    defaultMessage: 'Are you sure you want to delete this knowledge indicator?',
  }
);

const DELETE_RULE_MODAL_TITLE = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetailsFlyout.deleteRuleModalTitle',
  {
    defaultMessage: 'Are you sure you want to delete this rule?',
  }
);
