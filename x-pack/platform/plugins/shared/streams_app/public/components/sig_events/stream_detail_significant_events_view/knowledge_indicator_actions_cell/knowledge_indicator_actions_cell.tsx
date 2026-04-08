/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { Streams } from '@kbn/streams-schema';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useCallback, useMemo, useState } from 'react';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../hooks/sig_events/use_fetch_discovery_queries';
import { useKibana } from '../../../../hooks/use_kibana';
import { useQueriesApi } from '../../../../hooks/sig_events/use_queries_api';
import { useStreamFeaturesApi } from '../../../../hooks/sig_events/use_stream_features_api';

interface Props {
  definition: Streams.all.Definition;
  knowledgeIndicator: KnowledgeIndicator;
  onDeleteRequest: (knowledgeIndicator: KnowledgeIndicator) => void;
}

export function KnowledgeIndicatorActionsCell({
  definition,
  knowledgeIndicator,
  onDeleteRequest,
}: Props) {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useStreamFeaturesApi(definition);
  const { promote } = useQueriesApi();

  const invalidateKnowledgeIndicatorsData = useCallback(async () => {
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
      await invalidateKnowledgeIndicatorsData();
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
      await invalidateKnowledgeIndicatorsData();
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
      await invalidateKnowledgeIndicatorsData();
      toasts.addSuccess({ title: KI_PROMOTE_ACTION_SUCCESS_TOAST_TITLE });
    },
    onError: (error) => {
      toasts.addError(error, { title: KI_PROMOTE_ACTION_ERROR_TOAST_TITLE });
    },
  });

  const withActionLoading = useCallback((run: () => void) => {
    setIsActionInProgress(true);
    setIsActionsMenuOpen(false);
    run();
  }, []);

  const featureActionItems = useMemo(
    () =>
      knowledgeIndicator.kind === 'feature'
        ? [
            knowledgeIndicator.feature.excluded_at ? (
              <EuiContextMenuItem
                key="feature-restore"
                icon="eye"
                disabled={isActionInProgress}
                onClick={() =>
                  withActionLoading(() =>
                    restoreAction.mutate(knowledgeIndicator.feature.uuid, {
                      onSettled: () => {
                        setIsActionInProgress(false);
                      },
                    })
                  )
                }
              >
                {KI_ACTION_RESTORE_LABEL}
              </EuiContextMenuItem>
            ) : (
              <EuiContextMenuItem
                key="feature-exclude"
                icon="eyeClosed"
                disabled={isActionInProgress}
                onClick={() =>
                  withActionLoading(() =>
                    excludeAction.mutate(knowledgeIndicator.feature.uuid, {
                      onSettled: () => {
                        setIsActionInProgress(false);
                      },
                    })
                  )
                }
              >
                {KI_ACTION_EXCLUDE_LABEL}
              </EuiContextMenuItem>
            ),
            <EuiContextMenuItem
              key="feature-delete"
              icon="trash"
              color="danger"
              disabled={isActionInProgress}
              onClick={() => {
                setIsActionsMenuOpen(false);
                onDeleteRequest(knowledgeIndicator);
              }}
            >
              {KI_ACTION_DELETE_LABEL}
            </EuiContextMenuItem>,
          ]
        : [],
    [
      excludeAction,
      isActionInProgress,
      knowledgeIndicator,
      onDeleteRequest,
      restoreAction,
      withActionLoading,
    ]
  );

  const queryActionItems = useMemo(
    () =>
      knowledgeIndicator.kind === 'query'
        ? [
            <EuiContextMenuItem
              key="query-promote"
              icon="plusCircle"
              disabled={isActionInProgress || knowledgeIndicator.rule.backed}
              onClick={() =>
                withActionLoading(() =>
                  promoteAction.mutate(knowledgeIndicator.query.id, {
                    onSettled: () => {
                      setIsActionInProgress(false);
                    },
                  })
                )
              }
            >
              {KI_ACTION_PROMOTE_LABEL}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="query-delete"
              icon="trash"
              color="danger"
              disabled={isActionInProgress}
              onClick={() => {
                setIsActionsMenuOpen(false);
                onDeleteRequest(knowledgeIndicator);
              }}
            >
              {KI_ACTION_DELETE_LABEL}
            </EuiContextMenuItem>,
          ]
        : [],
    [isActionInProgress, knowledgeIndicator, onDeleteRequest, promoteAction, withActionLoading]
  );

  return (
    <EuiPopover
      aria-label={KI_ACTIONS_MENU_POPOVER_ARIA_LABEL}
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          aria-label={KI_ACTIONS_MENU_BUTTON_ARIA_LABEL}
          isLoading={isActionInProgress}
          isDisabled={isActionInProgress}
          onClick={() => setIsActionsMenuOpen((current) => !current)}
        />
      }
      isOpen={isActionsMenuOpen}
      closePopover={() => setIsActionsMenuOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel size="s" items={[...featureActionItems, ...queryActionItems]} />
    </EuiPopover>
  );
}

const KI_ACTIONS_MENU_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.actionsMenuButtonAriaLabel',
  {
    defaultMessage: 'Knowledge indicator actions',
  }
);

const KI_ACTIONS_MENU_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.actionsMenuPopoverAriaLabel',
  {
    defaultMessage: 'Knowledge indicator actions menu',
  }
);

const KI_ACTION_DELETE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.action.delete',
  {
    defaultMessage: 'Delete',
  }
);

const KI_ACTION_EXCLUDE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.action.exclude',
  {
    defaultMessage: 'Exclude',
  }
);

const KI_ACTION_RESTORE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.action.restore',
  {
    defaultMessage: 'Restore',
  }
);

const KI_ACTION_PROMOTE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.action.promote',
  {
    defaultMessage: 'Promote',
  }
);

const KI_EXCLUDE_ACTION_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsTable.excludeActionSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicator excluded',
  }
);

const KI_EXCLUDE_ACTION_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsTable.excludeActionErrorToastTitle',
  {
    defaultMessage: 'Failed to exclude knowledge indicator',
  }
);

const KI_RESTORE_ACTION_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsTable.restoreActionSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicator restored',
  }
);

const KI_RESTORE_ACTION_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsTable.restoreActionErrorToastTitle',
  {
    defaultMessage: 'Failed to restore knowledge indicator',
  }
);

const KI_PROMOTE_ACTION_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsTable.promoteActionSuccessToastTitle',
  {
    defaultMessage: 'Knowledge indicator promoted',
  }
);

const KI_PROMOTE_ACTION_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsTable.promoteActionErrorToastTitle',
  {
    defaultMessage: 'Failed to promote knowledge indicator',
  }
);
