/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ToolDefinition, ToolSelection } from '@kbn/agent-builder-common';
import { defaultAgentToolIds } from '@kbn/agent-builder-common';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useQueryState } from '../../../hooks/use_query_state';
import { searchParamNames } from '../../../search_param_names';
import { labels } from '../../../utils/i18n';
import { appPaths } from '../../../utils/app_paths';
import { useNavigation } from '../../../hooks/use_navigation';
import { useToolsService } from '../../../hooks/tools/use_tools';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useToasts } from '../../../hooks/use_toasts';
import { queryKeys } from '../../../query_keys';
import { useFlyoutState } from '../../../hooks/use_flyout_state';
import {
  getActiveTools,
  isToolSelected,
  toggleToolSelection,
} from '../../../utils/tool_selection_utils';
import { ActiveItemRow } from '../common/active_item_row';
import { ToolLibraryPanel } from './tool_library_panel';
import { ToolDetailPanel } from './tool_detail_panel';
import { PageWrapper } from '../common/page_wrapper';
import { ICON_DIMENSIONS } from '../common/constants';
import { useListDetailPageStyles } from '../common/styles';
import { useCanEditAgent } from '../../../hooks/agents/use_can_edit_agent';
import { ToolsCustomizeEmptyState } from './tools_customize_empty_state';

const ActiveToolsList: React.FC<{
  filteredActiveTools: ToolDefinition[];
  searchQuery: string;
  selectedToolId: string | null;
  enableElasticCapabilities: boolean;
  defaultToolIdSet: Set<string>;
  isRemoving: boolean;
  onSelect: (id: string) => void;
  onRemove: (tool: ToolDefinition) => void;
  canEditAgent: boolean;
}> = ({
  filteredActiveTools,
  searchQuery,
  selectedToolId,
  enableElasticCapabilities,
  defaultToolIdSet,
  isRemoving,
  onSelect,
  onRemove,
  canEditAgent,
}) => {
  if (filteredActiveTools.length === 0) {
    return (
      <EuiText size="s" color="subdued" textAlign="center">
        <p>
          {searchQuery.trim()
            ? labels.agentTools.noActiveToolsMatchMessage
            : labels.agentTools.noActiveToolsMessage}
        </p>
      </EuiText>
    );
  }

  return (
    <>
      {filteredActiveTools.map((tool) => {
        const isBuiltIn = defaultToolIdSet.has(tool.id);
        const isAutoIncluded = enableElasticCapabilities && isBuiltIn;
        return (
          <ActiveItemRow
            key={tool.id}
            id={tool.id}
            name={tool.id}
            isSelected={selectedToolId === tool.id}
            onSelect={() => onSelect(tool.id)}
            onRemove={() => onRemove(tool)}
            isRemoving={isRemoving}
            removeAriaLabel={labels.agentTools.removeToolAriaLabel}
            readOnlyContent={
              isAutoIncluded ? (
                <EuiBadge color="hollow">
                  {labels.agentTools.elasticCapabilitiesReadOnlyBadge}
                </EuiBadge>
              ) : isBuiltIn ? (
                <EuiBadge color="hollow">{labels.agentTools.readOnlyBadge}</EuiBadge>
              ) : undefined
            }
            canEditAgent={canEditAgent}
          />
        );
      })}
    </>
  );
};

export const AgentTools: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const styles = useListDetailPageStyles();
  const { createAgentBuilderUrl } = useNavigation();
  const { agentService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();
  const queryClient = useQueryClient();

  const { agent, isLoading: agentLoading } = useAgentBuilderAgentById(agentId);
  const { tools: allTools, isLoading: toolsLoading } = useToolsService();
  const canEditAgent = useCanEditAgent({ agent });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToolId, setSelectedToolId] = useQueryState<string>(searchParamNames.toolId);
  const [mutatingToolId, setMutatingToolId] = useState<string | null>(null);
  const {
    isOpen: isLibraryOpen,
    openFlyout: openLibrary,
    closeFlyout: closeLibrary,
  } = useFlyoutState();

  const agentToolSelections = useMemo(
    () => agent?.configuration?.tools ?? [],
    [agent?.configuration?.tools]
  );

  const enableElasticCapabilities = agent?.configuration?.enable_elastic_capabilities ?? false;

  const defaultToolIdSet = useMemo(() => new Set<string>(defaultAgentToolIds), []);

  const activeTools = useMemo(
    () =>
      agent
        ? getActiveTools(allTools, agentToolSelections, enableElasticCapabilities, defaultToolIdSet)
        : [],
    [allTools, agentToolSelections, agent, enableElasticCapabilities, defaultToolIdSet]
  );

  const activeToolIdSet = useMemo(() => new Set(activeTools.map((t) => t.id)), [activeTools]);

  const libraryActiveToolIdSet = useMemo(() => {
    if (enableElasticCapabilities) return new Set([...activeToolIdSet, ...defaultToolIdSet]);
    return activeToolIdSet;
  }, [activeToolIdSet, enableElasticCapabilities, defaultToolIdSet]);

  useEffect(() => {
    if (agentLoading || toolsLoading) return;

    if (!selectedToolId) {
      if (activeTools.length > 0) {
        setSelectedToolId(activeTools[0].id);
      }
    } else {
      const stillActive = activeTools.some((t) => t.id === selectedToolId);
      if (!stillActive) {
        setSelectedToolId(activeTools[0]?.id ?? null);
      }
    }
  }, [activeTools, selectedToolId, setSelectedToolId, agentLoading, toolsLoading]);

  const filteredActiveTools = useMemo(() => {
    if (!searchQuery.trim()) return activeTools;
    const lower = searchQuery.toLowerCase();
    return activeTools.filter(
      (t) => t.id.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower)
    );
  }, [activeTools, searchQuery]);

  const updateToolsMutation = useMutation({
    mutationFn: (newToolSelections: ToolSelection[]) => {
      return agentService.update(agentId!, { configuration: { tools: newToolSelections } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
    },
    onError: () => {
      addErrorToast({ title: labels.agentTools.updateToolsErrorToast });
    },
  });

  const handleAddTool = useCallback(
    async (tool: ToolDefinition) => {
      if (isToolSelected(tool, agentToolSelections)) return;
      const newSelections = toggleToolSelection(tool.id, allTools, agentToolSelections);
      setMutatingToolId(tool.id);
      try {
        await updateToolsMutation.mutateAsync(newSelections);
        addSuccessToast({ title: labels.agentTools.addToolSuccessToast(tool.id) });
      } finally {
        setMutatingToolId(null);
      }
    },
    [agentToolSelections, allTools, updateToolsMutation, addSuccessToast]
  );

  const handleRemoveTool = useCallback(
    (tool: ToolDefinition) => {
      const newSelections = toggleToolSelection(tool.id, allTools, agentToolSelections);
      setMutatingToolId(tool.id);
      updateToolsMutation.mutate(newSelections, {
        onSuccess: () => {
          setSelectedToolId(null);
          addSuccessToast({ title: labels.agentTools.removeToolSuccessToast(tool.id) });
        },
        onSettled: () => setMutatingToolId(null),
      });
    },
    [agentToolSelections, allTools, updateToolsMutation, addSuccessToast, setSelectedToolId]
  );

  const handleToggleTool = useCallback(
    (tool: ToolDefinition, isActive: boolean) => {
      if (enableElasticCapabilities && defaultToolIdSet.has(tool.id)) return;
      if (isActive) {
        handleAddTool(tool);
      } else {
        handleRemoveTool(tool);
      }
    },
    [handleAddTool, handleRemoveTool, enableElasticCapabilities, defaultToolIdSet]
  );

  /** Guarded removal: only prevents removing auto-included tools from the agent. */
  const handleRemoveSelectedTool = useCallback(() => {
    if (!selectedToolId) return;
    if (enableElasticCapabilities && defaultToolIdSet.has(selectedToolId)) return;
    const tool = activeTools.find((t) => t.id === selectedToolId);
    if (tool) {
      handleRemoveTool(tool);
    }
  }, [selectedToolId, activeTools, handleRemoveTool, enableElasticCapabilities, defaultToolIdSet]);

  const showCustomizeEmptyState = activeTools.length === 0 && !searchQuery.trim();

  const isLoading = agentLoading || toolsLoading;

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" css={styles.loadingSpinner}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  const toolModals = isLibraryOpen ? (
    <ToolLibraryPanel
      onClose={closeLibrary}
      allTools={allTools}
      activeToolIdSet={libraryActiveToolIdSet}
      onToggleTool={handleToggleTool}
      mutatingToolId={mutatingToolId}
      enableElasticCapabilities={enableElasticCapabilities}
      builtinToolIdSet={defaultToolIdSet}
    />
  ) : null;

  if (showCustomizeEmptyState) {
    return (
      <PageWrapper>
        <ToolsCustomizeEmptyState canEditAgent={canEditAgent} onOpenLibrary={openLibrary} />
        {toolModals}
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div css={styles.header}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="wrench" aria-hidden={true} css={ICON_DIMENSIONS} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>{labels.tools.title}</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty href={createAgentBuilderUrl(appPaths.manage.tools)}>
                  {labels.agentTools.manageAllTools}
                </EuiButtonEmpty>
              </EuiFlexItem>
              {canEditAgent && (
                <EuiFlexItem grow={false}>
                  <EuiButton fill iconType="plusInCircle" iconSide="left" onClick={openLibrary}>
                    {labels.agentTools.addToolButton}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {labels.agentTools.pageDescription}
        </EuiText>
      </div>

      <EuiFlexGroup gutterSize="none" responsive={false} css={styles.body}>
        <EuiFlexItem grow={false} css={styles.searchColumn}>
          <div css={styles.searchInputWrapper}>
            <EuiFieldSearch
              placeholder={labels.agentTools.searchActiveToolsPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              incremental
              fullWidth
            />
          </div>

          <div css={styles.scrollableList}>
            <ActiveToolsList
              filteredActiveTools={filteredActiveTools}
              searchQuery={searchQuery}
              selectedToolId={selectedToolId}
              enableElasticCapabilities={enableElasticCapabilities}
              defaultToolIdSet={defaultToolIdSet}
              isRemoving={updateToolsMutation.isLoading}
              onSelect={setSelectedToolId}
              onRemove={handleRemoveTool}
              canEditAgent={canEditAgent}
            />
          </div>
        </EuiFlexItem>

        <EuiFlexItem css={styles.detailPanelWrapper}>
          {selectedToolId ? (
            <ToolDetailPanel
              toolId={selectedToolId}
              onRemove={handleRemoveSelectedTool}
              isAutoIncluded={enableElasticCapabilities && defaultToolIdSet.has(selectedToolId)}
              canEditAgent={canEditAgent}
            />
          ) : (
            <EuiFlexGroup
              justifyContent="center"
              alignItems="center"
              css={styles.noSelectionPlaceholder}
            >
              <EuiText size="s" color="subdued">
                {labels.agentTools.noToolSelectedMessage}
              </EuiText>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {toolModals}
    </PageWrapper>
  );
};
