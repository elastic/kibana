/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexItem, EuiText, EuiButtonEmpty, EuiPopover, EuiContextMenu } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import * as i18n from '../templates/translations';
import type { Template } from './types';

export interface TemplatesBulkActionsProps {
  selectedTemplates: Template[];
}

const TemplatesBulkActionsComponent: React.FC<TemplatesBulkActionsProps> = ({
  selectedTemplates,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const handleBulkExport = useCallback(() => {
    closePopover();
    // TODO: Implement bulk export
  }, [closePopover]);

  const handleBulkDelete = useCallback(() => {
    closePopover();
    // TODO: Implement bulk delete
  }, [closePopover]);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.BULK_EXPORT_TEMPLATES,
            icon: 'exportAction',
            onClick: handleBulkExport,
            'data-test-subj': 'templates-bulk-action-export',
          },
          {
            name: i18n.BULK_DELETE_TEMPLATES,
            icon: 'trash',
            onClick: handleBulkDelete,
            'data-test-subj': 'templates-bulk-action-delete',
          },
        ],
      },
    ],
    [handleBulkExport, handleBulkDelete]
  );

  if (selectedTemplates.length === 0) {
    return null;
  }

  return (
    <>
      <EuiFlexItem grow={false} data-test-subj="templates-table-selected-count">
        <EuiText size="xs" color="subdued">
          {i18n.SHOWING_SELECTED_TEMPLATES(selectedTemplates.length)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          data-test-subj="templates-bulk-actions-popover"
          button={
            <EuiButtonEmpty
              onClick={togglePopover}
              size="xs"
              iconSide="right"
              iconType="arrowDown"
              flush="left"
              data-test-subj="templates-bulk-actions-link-icon"
            >
              {i18n.BULK_ACTIONS}
            </EuiButtonEmpty>
          }
        >
          <EuiContextMenu
            panels={panels}
            initialPanelId={0}
            data-test-subj="templates-bulk-actions-context-menu"
          />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
};

TemplatesBulkActionsComponent.displayName = 'TemplatesBulkActionsComponent';

export const TemplatesBulkActions = React.memo(TemplatesBulkActionsComponent);
