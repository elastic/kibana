/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCheckbox,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiText,
  EuiTitle,
  EuiHeader,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ToolSelection, ToolDescriptor } from '@kbn/onechat-common';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { useAgentEdit } from '../../../hooks/agents/use_agent_edit';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

export interface AgentFormProps {
  mode: 'edit' | 'create';
  agentId?: string;
}

// Component for tools selection
const ToolsSelection: React.FC<{
  tools: ToolDescriptor[];
  toolsLoading: boolean;
  selectedTools: ToolSelection[];
  onToolsChange: (tools: ToolSelection[]) => void;
}> = ({ tools, toolsLoading, selectedTools, onToolsChange }) => {
  // Group tools by provider
  const toolsByProvider = useMemo(() => {
    const grouped: Record<string, ToolDescriptor[]> = {};
    tools.forEach((tool) => {
      const providerId = tool.meta.providerId;
      if (!grouped[providerId]) {
        grouped[providerId] = [];
      }
      grouped[providerId].push(tool);
    });
    return grouped;
  }, [tools]);

  // Check if all tools from a provider are selected
  const isAllToolsSelectedForProvider = (providerId: string) => {
    const providerTools = toolsByProvider[providerId] || [];
    return providerTools.every((tool) =>
      selectedTools.some(
        (selection) =>
          selection.toolIds.includes(tool.id) &&
          (!selection.provider || selection.provider === providerId)
      )
    );
  };

  // Check if a specific tool is selected
  const isToolSelected = (toolId: string, providerId: string) => {
    return selectedTools.some(
      (selection) =>
        selection.toolIds.includes(toolId) &&
        (!selection.provider || selection.provider === providerId)
    );
  };

  // Toggle all tools for a provider
  const toggleProviderTools = (providerId: string) => {
    const providerTools = toolsByProvider[providerId] || [];
    const allSelected = isAllToolsSelectedForProvider(providerId);

    if (allSelected) {
      // Remove all tools from this provider
      const newSelection = selectedTools.filter(
        (selection) =>
          !(
            selection.provider === providerId ||
            selection.toolIds.some((toolId) => providerTools.some((tool) => tool.id === toolId))
          )
      );
      onToolsChange(newSelection);
    } else {
      // Add all tools from this provider
      const existingSelection = selectedTools.filter(
        (selection) =>
          !(
            selection.provider === providerId ||
            selection.toolIds.some((toolId) => providerTools.some((tool) => tool.id === toolId))
          )
      );

      const newProviderSelection: ToolSelection = {
        provider: providerId,
        toolIds: providerTools.map((tool) => tool.id),
      };

      onToolsChange([...existingSelection, newProviderSelection]);
    }
  };

  // Toggle individual tool
  const toggleTool = (toolId: string, providerId: string) => {
    const isSelected = isToolSelected(toolId, providerId);

    if (isSelected) {
      // Remove this specific tool
      const newSelection = selectedTools
        .map((selection) => {
          if (selection.toolIds.includes(toolId)) {
            const newToolIds = selection.toolIds.filter((id) => id !== toolId);
            return newToolIds.length > 0 ? { ...selection, toolIds: newToolIds } : null;
          }
          return selection;
        })
        .filter(Boolean) as ToolSelection[];

      onToolsChange(newSelection);
    } else {
      // Add this specific tool
      const existingSelection = selectedTools.filter(
        (selection) => !selection.toolIds.includes(toolId)
      );

      const newToolSelection: ToolSelection = {
        toolIds: [toolId],
      };

      onToolsChange([...existingSelection, newToolSelection]);
    }
  };

  if (toolsLoading) {
    return <EuiText>Loading tools...</EuiText>;
  }

  return (
    <div>
      {Object.entries(toolsByProvider).map(([providerId, providerTools]) => {
        const columns: Array<EuiBasicTableColumn<ToolDescriptor>> = [
          {
            field: 'id',
            name: i18n.translate('xpack.onechat.tools.toolIdLabel', { defaultMessage: 'Tool' }),
            valign: 'top',
            render: (id: string, tool: ToolDescriptor) => (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiCheckbox
                    id={`tool-${tool.id}`}
                    checked={isToolSelected(tool.id, providerId)}
                    onChange={() => toggleTool(tool.id, providerId)}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{id}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          },
          {
            field: 'description',
            name: i18n.translate('xpack.onechat.tools.toolDescriptionLabel', {
              defaultMessage: 'Description',
            }),
            width: '60%',
            valign: 'top',
            render: (description: string) => <EuiText size="s">{description}</EuiText>,
          },
        ];

        return (
          <div key={providerId}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiCheckbox
                  id={`provider-${providerId}`}
                  checked={isAllToolsSelectedForProvider(providerId)}
                  onChange={() => toggleProviderTools(providerId)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h4>{providerId} Tools</h4>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EuiBasicTable
              columns={columns}
              items={providerTools}
              itemId="id"
              noItemsMessage="No tools available"
            />

            <EuiSpacer size="m" />
          </div>
        );
      })}
    </div>
  );
};

export const AgentForm: React.FC<AgentFormProps> = ({ mode, agentId }) => {
  const { navigateToOnechatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();

  // Success/error handlers
  const onSaveSuccess = () => {
    notifications.toasts.addSuccess(
      i18n.translate('xpack.onechat.agents.createSuccessMessage', {
        defaultMessage: 'Agent created successfully',
      })
    );
    navigateToOnechatUrl(appPaths.agents.list);
  };
  const onSaveError = (err: Error) => {
    notifications.toasts.addError(err, {
      title: i18n.translate('xpack.onechat.agents.createErrorMessage', {
        defaultMessage: 'Failed to create agent',
      }),
    });
  };

  const {
    state: agentState,
    isLoading,
    isSubmitting,
    submit,
    tools,
    error,
  } = useAgentEdit({
    agentId,
    onSaveSuccess,
    onSaveError,
  });

  const formMethods = useForm({
    defaultValues: { ...agentState },
  });
  const { control, handleSubmit, reset, formState, setValue, watch } = formMethods;

  // Reset form when agent data loads
  useEffect(() => {
    if (agentState && !isLoading) {
      reset(agentState);
    }
  }, [agentState, isLoading, reset]);

  // Watch the toolSelection field
  const toolSelection = watch('toolSelection');

  // Error message helper
  const getErrorMessage = (err: unknown) => {
    if (!err) return undefined;
    if (typeof err === 'object' && 'message' in err) {
      return (err as Error).message;
    }
    return String(err);
  };

  const onSubmit = (data: any) => {
    submit(data);
  };

  // Handle tools selection change
  const handleToolsChange = (newToolSelection: ToolSelection[]) => {
    setValue('toolSelection', newToolSelection);
  };

  // Compose error message
  const errorMessage =
    getErrorMessage(error) ||
    (formState.errors.name && 'Name is required') ||
    (formState.errors.description && 'Description is required') ||
    (formState.errors.id && 'ID is required');

  return (
    <FormProvider {...formMethods}>
      <EuiForm component="form" onSubmit={handleSubmit(onSubmit)} isInvalid={!!errorMessage}>
        <EuiFormRow
          label="Agent ID"
          isInvalid={!!formState.errors.id}
          error={formState.errors.id && 'ID is required'}
        >
          <Controller
            name="id"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiFieldText
                {...field}
                disabled={isLoading || isSubmitting || mode === 'edit'}
                placeholder={mode === 'create' ? 'Enter agent ID' : ''}
              />
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Agent Name"
          isInvalid={!!formState.errors.name}
          error={formState.errors.name && 'Name is required'}
        >
          <Controller
            name="name"
            control={control}
            rules={{ required: true }}
            render={({ field }) => <EuiFieldText {...field} disabled={isLoading || isSubmitting} />}
          />
        </EuiFormRow>
        <EuiFormRow label="Description">
          <Controller
            name="description"
            control={control}
            render={({ field }) => <EuiFieldText {...field} disabled={isLoading || isSubmitting} />}
          />
        </EuiFormRow>
        <EuiFormRow label="Extra Instructions">
          <Controller
            name="customInstructions"
            control={control}
            render={({ field }) => (
              <EuiTextArea {...field} rows={4} disabled={isLoading || isSubmitting} />
            )}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />
        <EuiHeader>
          <EuiTitle size="s">
            <h4>Select Agent Tools</h4>
          </EuiTitle>
        </EuiHeader>
        <EuiSpacer size="l" />
        <ToolsSelection
          tools={tools}
          toolsLoading={isLoading}
          selectedTools={toolSelection || []}
          onToolsChange={handleToolsChange}
        />

        {errorMessage && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut color="danger" title="Error">
              {errorMessage}
            </EuiCallOut>
          </>
        )}
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              fill
              isLoading={isSubmitting}
              disabled={
                isLoading || isSubmitting || !formMethods.watch('name') || !formMethods.watch('id')
              }
            >
              {mode === 'create' ? 'Create Agent' : 'Save Changes'}
            </EuiButton>
          </EuiFlexItem>
          {mode === 'edit' && (
            <EuiFlexItem grow={false}>
              <EuiButton color="danger" onClick={() => {}} disabled={isSubmitting}>
                Delete
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => navigateToOnechatUrl(appPaths.agents.list)}
              disabled={isSubmitting}
            >
              Cancel
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </FormProvider>
  );
};
