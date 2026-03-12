/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexItem, EuiText, EuiButtonEmpty, EuiPopover, EuiContextMenu } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { Template } from '../../../../common/types/domain/template/v1';
import * as i18n from '../../templates/translations';
import { useBulkDeleteTemplates } from '../hooks/use_bulk_delete_templates';
import { useBulkExportTemplates } from '../hooks/use_bulk_export_templates';
import { DeleteConfirmationModal } from '../../configure_cases/delete_confirmation_modal';

export interface TemplatesBulkActionsProps {
  selectedTemplates: Template[];
  onActionSuccess?: () => void;
}

const TemplatesBulkActionsComponent: React.FC<TemplatesBulkActionsProps> = ({
  selectedTemplates,
  onActionSuccess,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const { mutate: bulkDeleteTemplates, isLoading: isBulkDeleting } = useBulkDeleteTemplates({
    onSuccess: onActionSuccess,
  });
  const { mutate: bulkExportTemplates, isLoading: isBulkExporting } = useBulkExportTemplates();

  const selectedTemplateIds = useMemo(
    () => selectedTemplates.map((template) => template.templateId),
    [selectedTemplates]
  );

  const handleBulkExport = useCallback(() => {
    closePopover();
    bulkExportTemplates({ templateIds: selectedTemplateIds });
  }, [closePopover, bulkExportTemplates, selectedTemplateIds]);

  const handleBulkDeleteClick = useCallback(() => {
    closePopover();
    setIsDeleteModalVisible(true);
  }, [closePopover]);

  const handleConfirmBulkDelete = useCallback(() => {
    bulkDeleteTemplates({ templateIds: selectedTemplateIds });
    setIsDeleteModalVisible(false);
  }, [bulkDeleteTemplates, selectedTemplateIds]);

  const handleCancelBulkDelete = useCallback(() => {
    setIsDeleteModalVisible(false);
  }, []);

  const isLoading = isBulkDeleting || isBulkExporting;

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.BULK_EXPORT_TEMPLATES,
            icon: 'exportAction',
            onClick: handleBulkExport,
            disabled: isLoading,
            'data-test-subj': 'templates-bulk-action-export',
          },
          {
            name: i18n.BULK_DELETE_TEMPLATES,
            icon: 'trash',
            onClick: handleBulkDeleteClick,
            disabled: isLoading,
            'data-test-subj': 'templates-bulk-action-delete',
          },
        ],
      },
    ],
    [handleBulkExport, handleBulkDeleteClick, isLoading]
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
      {isDeleteModalVisible && (
        <DeleteConfirmationModal
          title={i18n.BULK_DELETE_TITLE(selectedTemplates.length)}
          message={i18n.BULK_DELETE_MESSAGE(selectedTemplates.length)}
          onCancel={handleCancelBulkDelete}
          onConfirm={handleConfirmBulkDelete}
        />
      )}
    </>
  );
};

TemplatesBulkActionsComponent.displayName = 'TemplatesBulkActionsComponent';

export const TemplatesBulkActions = React.memo(TemplatesBulkActionsComponent);
