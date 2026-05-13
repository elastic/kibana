/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import type { ToolType } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
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
import { useKibana } from '../hooks/use_kibana';
import { reportAgentBuilderUiClick } from '../report_agent_builder_ui_click';

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
  const {
    services: {
      analytics,
      appParams: { history },
    },
  } = useKibana();
  const pathname = history.location.pathname;

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
    usedByAgents,
    isForceConfirmModalOpen,
    confirmForceDelete,
    cancelForceDelete,
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

  const deleteToolUsedByAgentsTitleId = useGeneratedHtmlId({
    prefix: 'deleteToolUsedByAgentsTitle',
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
          onCancel={() => {
            reportAgentBuilderUiClick(analytics, {
              ebt_element: AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_TABLE,
              ebt_action: AGENT_BUILDER_UI_EBT.action.manageTools.DELETE_MODAL_CANCEL,
              ebt_detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              element_kind: 'button',
              location_pathname: pathname,
            });
            cancelDelete();
          }}
          onConfirm={() => {
            reportAgentBuilderUiClick(analytics, {
              ebt_element: AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_TABLE,
              ebt_action: AGENT_BUILDER_UI_EBT.action.manageTools.DELETE_MODAL_CONFIRM,
              ebt_detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              element_kind: 'button',
              location_pathname: pathname,
            });
            void confirmDelete();
          }}
          isLoading={isDeletingTool}
          cancelButtonText={labels.tools.deleteEsqlToolCancelButton}
          confirmButtonText={labels.tools.deleteEsqlToolConfirmButton}
          buttonColor="danger"
        >
          <EuiText>{labels.tools.deleteEsqlToolConfirmationText}</EuiText>
        </EuiConfirmModal>
      )}
      {isForceConfirmModalOpen && usedByAgents && (
        <EuiConfirmModal
          title={labels.tools.deleteToolUsedByAgentsTitle(usedByAgents.toolId)}
          aria-labelledby={deleteToolUsedByAgentsTitleId}
          titleProps={{ id: deleteToolUsedByAgentsTitleId }}
          onCancel={() => {
            reportAgentBuilderUiClick(analytics, {
              ebt_element: AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_TABLE,
              ebt_action: AGENT_BUILDER_UI_EBT.action.manageGlobal.USED_BY_WARNING_DISMISS,
              ebt_detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              element_kind: 'button',
              location_pathname: pathname,
            });
            cancelForceDelete();
          }}
          onConfirm={() => {
            reportAgentBuilderUiClick(analytics, {
              ebt_element: AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_TABLE,
              ebt_action: AGENT_BUILDER_UI_EBT.action.manageGlobal.USED_BY_WARNING_PROCEEDED,
              ebt_detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              element_kind: 'button',
              location_pathname: pathname,
            });
            void confirmForceDelete();
          }}
          isLoading={isDeletingTool}
          cancelButtonText={labels.tools.deleteToolUsedByAgentsCancelButton}
          confirmButtonText={labels.tools.deleteToolUsedByAgentsConfirmButton}
          buttonColor="danger"
        >
          <EuiText>
            <p>{labels.tools.deleteToolUsedByAgentsDescription}</p>
            {usedByAgents.agents.length > 0 && (
              <p>
                <strong>{labels.tools.deleteToolUsedByAgentsAgentListLabel}:</strong>{' '}
                {labels.tools.deleteToolUsedByAgentsAgentList(
                  usedByAgents.agents.map((a) => a.name)
                )}
              </p>
            )}
          </EuiText>
        </EuiConfirmModal>
      )}
      {isBulkDeleteToolsModalOpen && (
        <EuiConfirmModal
          title={labels.tools.bulkDeleteEsqlToolsTitle(bulkDeleteToolIds.length)}
          aria-labelledby={bulkDeleteEsqlToolsTitleId}
          titleProps={{ id: bulkDeleteEsqlToolsTitleId }}
          onCancel={() => {
            reportAgentBuilderUiClick(analytics, {
              ebt_element: AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_TABLE,
              ebt_action: AGENT_BUILDER_UI_EBT.action.manageTools.BULK_DELETE_MODAL_CANCEL,
              ebt_detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              element_kind: 'button',
              location_pathname: pathname,
            });
            cancelBulkDeleteTools();
          }}
          onConfirm={() => {
            reportAgentBuilderUiClick(analytics, {
              ebt_element: AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_TABLE,
              ebt_action: AGENT_BUILDER_UI_EBT.action.manageTools.BULK_DELETE_MODAL_CONFIRM,
              ebt_detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              element_kind: 'button',
              location_pathname: pathname,
            });
            void confirmBulkDeleteTools();
          }}
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
