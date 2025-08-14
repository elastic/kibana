/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { noop } from 'lodash';
import React, { createContext, useCallback, useContext } from 'react';
import { OnechatEsqlToolFlyout } from '../components/tools/esql/esql_tool_flyout';
import { OnechatEsqlToolFormMode } from '../components/tools/esql/form/esql_tool_form';
import { OnechatEsqlToolFormData } from '../components/tools/esql/form/types/esql_tool_form_types';
import { useCreateToolFlyout } from '../hooks/tools/use_create_tools';
import { useDeleteToolModal, useDeleteToolsModal } from '../hooks/tools/use_delete_tools';
import { useEditToolFlyout } from '../hooks/tools/use_edit_tools';
import { labels } from '../utils/i18n';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
} from '../utils/transform_esql_form_data';

export interface ToolsActionsContextType {
  createTool: (toolId?: string | undefined) => void;
  editTool: (toolId: string) => void;
  deleteTool: (toolId: string) => void;
  bulkDeleteTools: (toolIds: string[]) => void;
  cloneTool: (toolId: string) => void;
  testTool: (toolId: string) => void;
}

export const ToolsTableActionsContext = createContext<ToolsActionsContextType | undefined>(
  undefined
);

export const ToolsTableProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeletingTool,
    toolId: deleteToolId,
    deleteTool,
    confirmDelete,
    cancelDelete,
  } = useDeleteToolModal();

  const {
    isOpen: isBulkDeleteToolsModalOpen,
    isLoading: isBulkDeletingTools,
    toolIds: bulkDeleteToolIds,
    deleteTools: bulkDeleteTools,
    confirmDelete: confirmBulkDeleteTools,
    cancelDelete: cancelBulkDeleteTools,
  } = useDeleteToolsModal();

  const {
    isOpen: isCreateToolFlyoutOpen,
    openFlyout: openCreateToolFlyout,
    closeFlyout: closeCreateToolFlyout,
    submit: createTool,
    isSubmitting: isCreatingTool,
    isLoading: isLoadingSourceTool,
    sourceTool: sourceTool,
  } = useCreateToolFlyout();

  const {
    isOpen: isEditToolFlyoutOpen,
    tool: editingTool,
    openFlyout: openEditToolFlyout,
    closeFlyout: closeEditToolFlyout,
    submit: updateTool,
    isLoading: isLoadingEditTool,
    isSubmitting: isUpdatingTool,
  } = useEditToolFlyout();

  const handleCreateTool = useCallback(
    (data: OnechatEsqlToolFormData) => createTool(transformEsqlFormDataForCreate(data)),
    [createTool]
  );

  const handleUpdateTool = useCallback(
    (data: OnechatEsqlToolFormData) => updateTool(transformEsqlFormDataForUpdate(data)),
    [updateTool]
  );

  const isEditingTool = isEditToolFlyoutOpen;
  const esqlToolFlyoutProps = isEditingTool
    ? {
        isOpen: isEditToolFlyoutOpen,
        onClose: closeEditToolFlyout,
        mode: OnechatEsqlToolFormMode.Edit,
        tool: editingTool,
        submit: handleUpdateTool,
        isSubmitting: isUpdatingTool,
        isLoading: isLoadingEditTool,
      }
    : {
        isOpen: isCreateToolFlyoutOpen,
        onClose: closeCreateToolFlyout,
        mode: OnechatEsqlToolFormMode.Create,
        tool: sourceTool,
        submit: handleCreateTool,
        isSubmitting: isCreatingTool,
        isLoading: isLoadingSourceTool,
      };

  const deleteEsqlToolTitleId = useGeneratedHtmlId({
    prefix: 'deleteEsqlToolTitle',
  });

  const bulkDeleteEsqlToolsTitleId = useGeneratedHtmlId({
    prefix: 'bulkDeleteEsqlToolsTitle',
  });

  return (
    <ToolsTableActionsContext.Provider
      value={{
        deleteTool,
        bulkDeleteTools,
        createTool: openCreateToolFlyout,
        editTool: openEditToolFlyout,
        cloneTool: openCreateToolFlyout,
        testTool: noop, // TODO: integrate with tool testing modal
      }}
    >
      {children}
      <OnechatEsqlToolFlyout {...esqlToolFlyoutProps} />
      {isDeleteModalOpen && (
        <EuiConfirmModal
          title={deleteToolId ? labels.tools.deleteEsqlToolTitle(deleteToolId) : ''}
          aria-labelledby={deleteEsqlToolTitleId}
          titleProps={{ id: deleteEsqlToolTitleId }}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          isLoading={isDeletingTool}
          cancelButtonText={labels.tools.deleteEsqlToolCancelButton}
          confirmButtonText={labels.tools.deleteEsqlToolConfirmButton}
          buttonColor="danger"
        >
          <EuiText>{labels.tools.deleteEsqlToolConfirmationText}</EuiText>
        </EuiConfirmModal>
      )}
      {isBulkDeleteToolsModalOpen && (
        <EuiConfirmModal
          title={labels.tools.bulkDeleteEsqlToolsTitle(bulkDeleteToolIds.length)}
          aria-labelledby={bulkDeleteEsqlToolsTitleId}
          titleProps={{ id: bulkDeleteEsqlToolsTitleId }}
          onCancel={cancelBulkDeleteTools}
          onConfirm={confirmBulkDeleteTools}
          isLoading={isBulkDeletingTools}
          cancelButtonText={labels.tools.deleteEsqlToolCancelButton}
          confirmButtonText={labels.tools.deleteEsqlToolConfirmButton}
          buttonColor="danger"
        >
          <EuiText>{labels.tools.bulkDeleteEsqlToolsConfirmationText}</EuiText>
        </EuiConfirmModal>
      )}
    </ToolsTableActionsContext.Provider>
  );
};

export const useToolsActions = () => {
  const context = useContext(ToolsTableActionsContext);
  if (!context) {
    throw new Error('useToolsActions must be used within a ToolsProvider');
  }
  return context;
};
