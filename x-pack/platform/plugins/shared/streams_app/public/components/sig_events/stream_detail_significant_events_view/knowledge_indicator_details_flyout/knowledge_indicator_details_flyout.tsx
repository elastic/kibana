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
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { Streams } from '@kbn/streams-schema';
import { upperFirst } from 'lodash';
import React, { useCallback, useState } from 'react';
import { getConfidenceColor } from '../../stream_detail_systems/stream_features/use_stream_features_table';
import { FlyoutMetadataCard } from '../../../flyout_components/flyout_metadata_card';
import { FlyoutToolbarHeader } from '../../../flyout_components/flyout_toolbar_header';
import { SeverityBadge } from '../severity_badge/severity_badge';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../hooks/sig_events/use_fetch_discovery_queries';
import { useKibana } from '../../../../hooks/use_kibana';
import { useQueriesApi } from '../../../../hooks/sig_events/use_queries_api';
import { useStreamFeaturesApi } from '../../../../hooks/sig_events/use_stream_features_api';
import { useKnowledgeIndicatorsBulkDelete } from '../hooks/use_knowledge_indicators_bulk_delete';
import { useRulesDemote } from '../hooks/use_queries_bulk_delete';
import { DeleteTableItemsModal } from '../delete_table_items_modal';
import { KnowledgeIndicatorFeatureDetailsContent } from './knowledge_indicator_feature_details_content';
import { KnowledgeIndicatorQueryDetailsContent } from './knowledge_indicator_query_details_content';

interface Props {
  definition: Streams.all.Definition;
  knowledgeIndicator: KnowledgeIndicator;
  occurrencesByQueryId: Record<string, Array<{ x: number; y: number }>>;
  onClose: () => void;
}

export function KnowledgeIndicatorDetailsFlyout({
  definition,
  knowledgeIndicator,
  occurrencesByQueryId,
  onClose,
}: Props) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'knowledgeIndicatorDetailsFlyoutTitle' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useStreamFeaturesApi(definition);
  const { promote } = useQueriesApi();

  const invalidateData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['features', definition.name] }),
    ]);
  }, [definition.name, queryClient]);

  const excludeAction = useMutation<void, Error, string>({
    mutationFn: async (featureUuid) => {
      await excludeFeaturesInBulk([featureUuid]);
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: KI_EXCLUDE_ACTION_SUCCESS_TOAST_TITLE });
    },
    onError: (error) => {
      toasts.addError(error, { title: KI_EXCLUDE_ACTION_ERROR_TOAST_TITLE });
    },
  });

  const restoreAction = useMutation<void, Error, string>({
    mutationFn: async (featureUuid) => {
      await restoreFeaturesInBulk([featureUuid]);
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: KI_RESTORE_ACTION_SUCCESS_TOAST_TITLE });
    },
    onError: (error) => {
      toasts.addError(error, { title: KI_RESTORE_ACTION_ERROR_TOAST_TITLE });
    },
  });

  const promoteAction = useMutation<void, Error, string>({
    mutationFn: async (queryId) => {
      await promote({ queryIds: [queryId] });
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: KI_PROMOTE_ACTION_SUCCESS_TOAST_TITLE });
    },
    onError: (error) => {
      toasts.addError(error, { title: KI_PROMOTE_ACTION_ERROR_TOAST_TITLE });
    },
  });

  const { deleteKnowledgeIndicatorsInBulk, isDeleting: isKIDeleting } =
    useKnowledgeIndicatorsBulkDelete({ definition, onSuccess: onClose });

  const { demoteRules, isPending: isDemoting } = useRulesDemote({ definition, onSuccess: onClose });

  const isDeleting = isKIDeleting || isDemoting;
  const isMutating =
    excludeAction.isLoading || restoreAction.isLoading || promoteAction.isLoading || isDeleting;

  const isRule = knowledgeIndicator.kind === 'query' && knowledgeIndicator.rule.backed;

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteModal(false);
    if (isRule && knowledgeIndicator.kind === 'query') {
      await demoteRules([knowledgeIndicator.query.id]);
    } else {
      await deleteKnowledgeIndicatorsInBulk([knowledgeIndicator]);
    }
  }, [isRule, knowledgeIndicator, demoteRules, deleteKnowledgeIndicatorsInBulk]);

  const title =
    knowledgeIndicator.kind === 'feature'
      ? knowledgeIndicator.feature.title ?? knowledgeIndicator.feature.id
      : knowledgeIndicator.query.title ?? knowledgeIndicator.query.id;

  const streamName =
    knowledgeIndicator.kind === 'feature'
      ? knowledgeIndicator.feature.stream_name
      : knowledgeIndicator.stream_name;

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
        <FlyoutToolbarHeader>
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={ACTIONS_MENU_POPOVER_ARIA_LABEL}
              button={
                <EuiButtonIcon
                  iconType="boxesVertical"
                  aria-label={ACTIONS_MENU_BUTTON_ARIA_LABEL}
                  isLoading={isMutating}
                  isDisabled={isMutating}
                  onClick={() => setIsActionsMenuOpen((open) => !open)}
                />
              }
              isOpen={isActionsMenuOpen}
              closePopover={() => setIsActionsMenuOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel
                size="s"
                items={[
                  ...(knowledgeIndicator.kind === 'feature'
                    ? [
                        knowledgeIndicator.feature.excluded_at ? (
                          <EuiContextMenuItem
                            key="feature-restore"
                            icon="eye"
                            onClick={() => {
                              setIsActionsMenuOpen(false);
                              restoreAction.mutate(knowledgeIndicator.feature.uuid);
                            }}
                          >
                            {RESTORE_LABEL}
                          </EuiContextMenuItem>
                        ) : (
                          <EuiContextMenuItem
                            key="feature-exclude"
                            icon="eyeClosed"
                            onClick={() => {
                              setIsActionsMenuOpen(false);
                              excludeAction.mutate(knowledgeIndicator.feature.uuid);
                            }}
                          >
                            {EXCLUDE_LABEL}
                          </EuiContextMenuItem>
                        ),
                        <EuiContextMenuItem
                          key="feature-delete"
                          icon="trash"
                          color="danger"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            setShowDeleteModal(true);
                          }}
                        >
                          {DELETE_LABEL}
                        </EuiContextMenuItem>,
                      ]
                    : [
                        ...(!knowledgeIndicator.rule.backed
                          ? [
                              <EuiContextMenuItem
                                key="query-promote"
                                icon="plusCircle"
                                onClick={() => {
                                  setIsActionsMenuOpen(false);
                                  promoteAction.mutate(knowledgeIndicator.query.id);
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
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            setShowDeleteModal(true);
                          }}
                        >
                          {DELETE_LABEL}
                        </EuiContextMenuItem>,
                      ]),
                ]}
              />
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={CLOSE_BUTTON_ARIA_LABEL}
              onClick={onClose}
            />
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
            <KnowledgeIndicatorFeatureDetailsContent feature={knowledgeIndicator.feature} />
          ) : (
            <KnowledgeIndicatorQueryDetailsContent
              query={knowledgeIndicator.query}
              occurrences={occurrencesByQueryId[knowledgeIndicator.query.id]}
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
  'xpack.streams.knowledgeIndicatorDetailsFlyout.closeButtonAriaLabel',
  {
    defaultMessage: 'Close',
  }
);

const CONFIDENCE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.confidenceLabel',
  { defaultMessage: 'Confidence' }
);

const TYPE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.typeLabel', {
  defaultMessage: 'Type',
});

const STREAM_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.streamLabel', {
  defaultMessage: 'Stream',
});

const SEVERITY_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.severityLabel',
  { defaultMessage: 'Severity' }
);

const QUERY_TYPE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.queryTypeLabel',
  { defaultMessage: 'Query' }
);

const ACTIONS_MENU_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.actionsMenuButtonAriaLabel',
  {
    defaultMessage: 'Actions',
  }
);

const ACTIONS_MENU_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.actionsMenuPopoverAriaLabel',
  {
    defaultMessage: 'Actions menu',
  }
);

const EXCLUDE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.excludeLabel', {
  defaultMessage: 'Exclude',
});

const RESTORE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.restoreLabel', {
  defaultMessage: 'Restore',
});

const PROMOTE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.promoteLabel', {
  defaultMessage: 'Promote',
});

const DELETE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.deleteLabel', {
  defaultMessage: 'Delete',
});

const DELETE_KI_MODAL_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.deleteKIModalTitle',
  {
    defaultMessage: 'Are you sure you want to delete this knowledge indicator?',
  }
);

const DELETE_RULE_MODAL_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.deleteRuleModalTitle',
  {
    defaultMessage: 'Are you sure you want to delete this rule?',
  }
);

const KI_EXCLUDE_ACTION_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.excludeActionSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicator excluded',
  }
);

const KI_EXCLUDE_ACTION_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.excludeActionErrorToastTitle',
  {
    defaultMessage: 'Failed to exclude knowledge indicator',
  }
);

const KI_RESTORE_ACTION_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.restoreActionSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicator restored',
  }
);

const KI_RESTORE_ACTION_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.restoreActionErrorToastTitle',
  {
    defaultMessage: 'Failed to restore knowledge indicator',
  }
);

const KI_PROMOTE_ACTION_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.promoteActionSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicator promoted',
  }
);

const KI_PROMOTE_ACTION_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.promoteActionErrorToastTitle',
  {
    defaultMessage: 'Failed to promote knowledge indicator',
  }
);
