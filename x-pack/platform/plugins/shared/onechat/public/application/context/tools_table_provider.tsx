/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { noop } from 'lodash';
import React, { createContext, useCallback, useContext } from 'react';
import { appPaths } from '../utils/app_paths';
import { useNavigation } from '../hooks/use_navigation';
import { useDeleteToolModal, useDeleteToolsModal } from '../hooks/tools/use_delete_tools';
import { labels } from '../utils/i18n';

export interface ToolsActionsContextType {
  createTool: () => void;
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
  const { navigateToOnechatUrl } = useNavigation();

  const createTool = useCallback(() => {
    navigateToOnechatUrl(appPaths.tools.new);
  }, [navigateToOnechatUrl]);

  const editTool = useCallback(
    (toolId: string) => {
      navigateToOnechatUrl(appPaths.tools.edit({ toolId }));
    },
    [navigateToOnechatUrl]
  );

  const cloneTool = useCallback(
    (toolId: string) => {
      navigateToOnechatUrl(appPaths.tools.new, { source: toolId });
    },
    [navigateToOnechatUrl]
  );

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
        createTool,
        editTool,
        cloneTool,
        testTool: noop, // TODO: integrate with tool testing modal
      }}
    >
      {children}
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
