/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import type { ToolType } from '@kbn/agent-builder-common';
import { appPaths } from '../utils/app_paths';
import { useNavigation } from '../hooks/use_navigation';
import { useDeleteTool, useDeleteTools } from '../hooks/tools/use_delete_tools';
import { labels } from '../utils/i18n';
import {
  TOOL_SOURCE_QUERY_PARAM,
  TOOL_TYPE_QUERY_PARAM,
  TEST_TOOL_ID_QUERY_PARAM,
} from '../components/tools/create_tool';
import { ToolTestFlyout } from '../components/tools/execute/test_tools';
import { useQueryState } from '../hooks/use_query_state';

export interface ToolsActionsContextType {
  createTool: (toolType: ToolType) => void;
  editTool: (toolId: string) => void;
  viewTool: (toolId: string) => void;
  deleteTool: (
    toolId: string,
    callbacks?: { onConfirm?: () => void; onCancel?: () => void }
  ) => void;
  bulkDeleteTools: (toolIds: string[]) => void;
  cloneTool: (toolId: string) => void;
  testTool: (toolId: string) => void;
  getCreateToolUrl: (toolType: ToolType) => string;
  getEditToolUrl: (toolId: string) => string;
  getCloneToolUrl: (toolId: string) => string;
  getViewToolUrl: (toolId: string) => string;
}

export const ToolsActionsContext = createContext<ToolsActionsContextType | undefined>(undefined);

export const ToolsProvider = ({ children }: { children: React.ReactNode }) => {
  const { navigateToAgentBuilderUrl, createAgentBuilderUrl } = useNavigation();

  const createTool = useCallback(
    (toolType: ToolType) => {
      navigateToAgentBuilderUrl(appPaths.tools.new, { [TOOL_TYPE_QUERY_PARAM]: toolType });
    },
    [navigateToAgentBuilderUrl]
  );

  const getCreateToolUrl = useCallback(
    (toolType: ToolType) => {
      return createAgentBuilderUrl(appPaths.tools.new, { [TOOL_TYPE_QUERY_PARAM]: toolType });
    },
    [createAgentBuilderUrl]
  );

  const editTool = useCallback(
    (toolId: string) => {
      navigateToAgentBuilderUrl(appPaths.tools.details({ toolId }));
    },
    [navigateToAgentBuilderUrl]
  );

  const viewTool = useCallback(
    (toolId: string) => {
      navigateToAgentBuilderUrl(appPaths.tools.details({ toolId }));
    },
    [navigateToAgentBuilderUrl]
  );

  const [testToolId, setTestToolId] = useState<string | null>(null);
  const [testToolIdParam, setTestToolIdParam] = useQueryState<string>(TEST_TOOL_ID_QUERY_PARAM);

  // Handle opening test flyout from query param (one-time trigger, then clear param)
  useEffect(() => {
    if (testToolIdParam && !testToolId) {
      setTestToolId(testToolIdParam);
      setTestToolIdParam(null);
    }
  }, [testToolIdParam, testToolId, setTestToolIdParam]);

  const testTool = useCallback((toolId: string) => {
    setTestToolId(toolId);
  }, []);

  const closeTestFlyout = useCallback(() => {
    setTestToolId(null);
  }, []);

  const getEditToolUrl = useCallback(
    (toolId: string) => {
      return createAgentBuilderUrl(appPaths.tools.details({ toolId }));
    },
    [createAgentBuilderUrl]
  );

  const getViewToolUrl = useCallback(
    (toolId: string) => {
      return createAgentBuilderUrl(appPaths.tools.details({ toolId }));
    },
    [createAgentBuilderUrl]
  );

  const cloneTool = useCallback(
    (toolId: string) => {
      navigateToAgentBuilderUrl(appPaths.tools.new, {
        [TOOL_SOURCE_QUERY_PARAM]: toolId,
      });
    },
    [navigateToAgentBuilderUrl]
  );

  const getCloneToolUrl = useCallback(
    (toolId: string) => {
      return createAgentBuilderUrl(appPaths.tools.new, {
        [TOOL_SOURCE_QUERY_PARAM]: toolId,
      });
    },
    [createAgentBuilderUrl]
  );

  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeletingTool,
    toolId: deleteToolId,
    deleteTool,
    confirmDelete,
    cancelDelete,
  } = useDeleteTool();

  const {
    isOpen: isBulkDeleteToolsModalOpen,
    isLoading: isBulkDeletingTools,
    toolIds: bulkDeleteToolIds,
    deleteTools: bulkDeleteTools,
    confirmDelete: confirmBulkDeleteTools,
    cancelDelete: cancelBulkDeleteTools,
  } = useDeleteTools();

  const deleteEsqlToolTitleId = useGeneratedHtmlId({
    prefix: 'deleteEsqlToolTitle',
  });

  const bulkDeleteEsqlToolsTitleId = useGeneratedHtmlId({
    prefix: 'bulkDeleteEsqlToolsTitle',
  });

  return (
    <ToolsActionsContext.Provider
      value={{
        deleteTool,
        bulkDeleteTools,
        createTool,
        editTool,
        viewTool,
        cloneTool,
        testTool,
        getCreateToolUrl,
        getEditToolUrl,
        getViewToolUrl,
        getCloneToolUrl,
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
      {testToolId && <ToolTestFlyout toolId={testToolId} onClose={closeTestFlyout} />}
    </ToolsActionsContext.Provider>
  );
};

export const useToolsActions = () => {
  const context = useContext(ToolsActionsContext);
  if (!context) {
    throw new Error('useToolsActions must be used within a ToolsProvider');
  }
  return context;
};
