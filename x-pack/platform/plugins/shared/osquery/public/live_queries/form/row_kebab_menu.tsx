/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useState, useMemo } from 'react';
import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AddToCaseContextProvider } from '../../cases/add_to_cases';
import { AddToCaseButton } from '../../cases/add_to_cases_button';
import { CasesAttachmentWrapperContext } from '../../shared_components/attachments/pack_queries_attachment_wrapper';
import { AddToTimelineButton } from '../../timelines/add_to_timeline_button';
import type { AddToTimelineHandler } from '../../types';

interface RowKebabMenuProps {
  row: { action_id?: string; id?: string };
  actionId: string | undefined;
  agentIds?: string[];
  addToTimeline?: AddToTimelineHandler;
  scheduleId?: string;
  executionCount?: number;
}

const RowKebabMenuContent: React.FC<RowKebabMenuProps> = React.memo(
  ({ row, actionId, agentIds, addToTimeline, scheduleId, executionCount }) => {
    const isCasesAttachment = useContext(CasesAttachmentWrapperContext);
    const [isOpen, setIsOpen] = useState(false);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const kebabLabel = i18n.translate(
      'xpack.osquery.pack.queriesTable.viewResultsMoreActionsAriaLabel',
      { defaultMessage: 'More actions' }
    );

    const menuItems = useMemo(
      () => [
        ...(row.action_id
          ? [
              <AddToTimelineButton
                key="timeline"
                field="action_id"
                value={row.action_id}
                addToTimeline={addToTimeline}
                displayAsMenuItem
                onMenuItemClick={close}
              />,
            ]
          : []),
        ...(!isCasesAttachment && actionId
          ? [
              <AddToCaseButton
                key="case"
                actionId={actionId}
                agentIds={agentIds}
                queryId={row.action_id}
                isIcon={false}
                isDisabled={!row.action_id}
                scheduleId={scheduleId}
                executionCount={executionCount}
                displayAsMenuItem
                onMenuItemClick={close}
              />,
            ]
          : []),
      ],
      [
        isCasesAttachment,
        row.action_id,
        actionId,
        agentIds,
        addToTimeline,
        scheduleId,
        executionCount,
        close,
      ]
    );

    if (menuItems.length === 0) return null;

    return (
      <EuiPopover
        button={
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={kebabLabel}
            onClick={toggle}
            data-test-subj={`packQueriesTableKebab-${row.id ?? row.action_id}`}
          />
        }
        isOpen={isOpen}
        closePopover={close}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        aria-label={kebabLabel}
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
      </EuiPopover>
    );
  }
);

RowKebabMenuContent.displayName = 'RowKebabMenuContent';

/**
 * Wraps CasesContext above the popover so the case selector modal
 * survives when the popover closes and unmounts its content.
 */
export const RowKebabMenu: React.FC<RowKebabMenuProps> = React.memo((props) => {
  if (!props.actionId && !props.scheduleId) {
    return <RowKebabMenuContent {...props} />;
  }

  return (
    <AddToCaseContextProvider>
      <RowKebabMenuContent {...props} />
    </AddToCaseContextProvider>
  );
});

RowKebabMenu.displayName = 'RowKebabMenu';
