/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { QUERY_TYPE_STATS } from '@kbn/streams-schema';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useMemo, useState } from 'react';
import {
  useKnowledgeIndicatorActions,
  DELETE_LABEL,
  EXCLUDE_LABEL,
  RESTORE_LABEL,
  PROMOTE_LABEL,
} from '../hooks/use_knowledge_indicator_actions';
import { STATS_PROMOTE_DISABLED_TOOLTIP } from '../../significant_events_discovery/components/queries_table/translations';

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
  const { excludeFeature, restoreFeature, promoteQuery, isMutating } = useKnowledgeIndicatorActions(
    { definition }
  );

  const featureActionItems = useMemo(
    () =>
      knowledgeIndicator.kind === 'feature'
        ? [
            knowledgeIndicator.feature.excluded_at ? (
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
            ) : (
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
            ),
            <EuiContextMenuItem
              key="feature-delete"
              icon="trash"
              color="danger"
              disabled={isMutating}
              onClick={() => {
                setIsActionsMenuOpen(false);
                onDeleteRequest(knowledgeIndicator);
              }}
            >
              {DELETE_LABEL}
            </EuiContextMenuItem>,
          ]
        : [],
    [excludeFeature, isMutating, knowledgeIndicator, onDeleteRequest, restoreFeature]
  );

  const queryActionItems = useMemo(() => {
    if (knowledgeIndicator.kind !== 'query') return [];

    const isStats = knowledgeIndicator.query.type === QUERY_TYPE_STATS;
    const isPromoteDisabled = isMutating || knowledgeIndicator.rule.backed || isStats;

    return [
      <EuiContextMenuItem
        key="query-promote"
        icon="plusInCircle"
        disabled={isPromoteDisabled}
        toolTipContent={isStats ? STATS_PROMOTE_DISABLED_TOOLTIP : undefined}
        onClick={() => {
          setIsActionsMenuOpen(false);
          promoteQuery(knowledgeIndicator.query.id);
        }}
      >
        {PROMOTE_LABEL}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="query-delete"
        icon="trash"
        disabled={isMutating}
        onClick={() => {
          setIsActionsMenuOpen(false);
          onDeleteRequest(knowledgeIndicator);
        }}
      >
        {DELETE_LABEL}
      </EuiContextMenuItem>,
    ];
  }, [isMutating, knowledgeIndicator, onDeleteRequest, promoteQuery]);

  return (
    <EuiPopover
      aria-label={ACTIONS_MENU_POPOVER_ARIA_LABEL}
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          aria-label={ACTIONS_MENU_BUTTON_ARIA_LABEL}
          isLoading={isMutating}
          isDisabled={isMutating}
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

const ACTIONS_MENU_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.actionsMenuButtonAriaLabel',
  {
    defaultMessage: 'Knowledge indicator actions',
  }
);

const ACTIONS_MENU_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.actionsMenuPopoverAriaLabel',
  {
    defaultMessage: 'Knowledge indicator actions menu',
  }
);
