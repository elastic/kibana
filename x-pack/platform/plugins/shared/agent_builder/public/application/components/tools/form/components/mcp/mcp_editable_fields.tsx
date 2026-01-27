/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  euiFontSize,
  EuiFormRow,
  EuiHighlight,
  EuiLink,
  EuiText,
  useEuiTheme,
  useUpdateEffect,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE } from '@kbn/connector-schemas/mcp/constants';
import type { Tool } from '@kbn/mcp-client';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useListConnectors, useListMcpTools } from '../../../../../hooks/tools/use_mcp_connectors';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { truncateAtSentence } from '../../../../../utils/truncate_at_sentence';
import { useAddMcpServerFlyout } from '../../hooks/use_add_mcp_server_flyout';
import { useEditMcpServerFlyout } from '../../hooks/use_edit_mcp_server_flyout';
import { i18nMessages } from '../../i18n';
import type { McpConfigurationFieldsProps } from '../../types/mcp';
import { McpToolHealthStatus } from '../../types/mcp';
import type { McpToolFormData } from '../../types/tool_form_types';
import { McpHealthBanner } from './mcp_health_banner';

interface McpToolOption extends Tool {
  shortDescription?: string;
}

const mcpActionLinkStyles = (euiThemeContext: UseEuiTheme) => css`
  font-size: ${euiFontSize(euiThemeContext, 'xs').fontSize};
  font-weight: ${euiThemeContext.euiTheme.font.weight.semiBold};
`;

export const McpEditableFields = ({
  mcpHealthStatus,
  setMcpHealthStatus,
}: McpConfigurationFieldsProps) => {
  const euiThemeContext = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();

  const {
    control,
    formState: { errors },
    clearErrors,
    setValue,
  } = useFormContext<McpToolFormData>();

  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      setValue('connectorId', connector.id, { shouldValidate: true });
    },
    [setValue]
  );

  const {
    openFlyout: openCreateMcpServerFlyout,
    isOpen: isCreateMcpServerFlyoutOpen,
    flyout: createMcpServerFlyout,
  } = useAddMcpServerFlyout({ onConnectorCreated: handleConnectorCreated });

  const handleBulkImportClick = useCallback(() => {
    navigateToAgentBuilderUrl(appPaths.tools.bulkImportMcp);
  }, [navigateToAgentBuilderUrl]);

  const { connectors, isLoading: isLoadingConnectors } = useListConnectors({
    type: MCP_CONNECTOR_TYPE,
  });

  const connectorId = useWatch({ control, name: 'connectorId' });

  const {
    mcpTools,
    isLoading: isLoadingMcpTools,
    isError: isErrorMcpTools,
  } = useListMcpTools({
    connectorId,
  });

  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === connectorId),
    [connectors, connectorId]
  );

  const {
    openFlyout: openEditMcpServerFlyout,
    isOpen: isEditMcpServerFlyoutOpen,
    flyout: editMcpServerFlyout,
  } = useEditMcpServerFlyout({ connector: selectedConnector });

  useEffect(() => {
    if (isLoadingMcpTools) {
      return;
    }

    if (isErrorMcpTools) {
      setMcpHealthStatus(McpToolHealthStatus.ListToolsFailed);
      return;
    }

    setMcpHealthStatus(McpToolHealthStatus.Healthy);
  }, [isLoadingMcpTools, isErrorMcpTools, setMcpHealthStatus]);

  // Clear the MCP tool, error state, and tool fields when the connector changes
  useUpdateEffect(() => {
    setValue('mcpToolName', '');
    setValue('toolId', '');
    setValue('description', '');
    clearErrors('mcpToolName');
  }, [connectorId]);

  const connectorOptions: EuiComboBoxOptionOption<string>[] = useMemo(
    () =>
      connectors.map((connector) => ({
        label: connector.name,
        value: connector.id,
        'data-test-subj': `mcpConnectorOption-${connector.id}`,
      })),
    [connectors]
  );

  const mcpToolOptions: EuiComboBoxOptionOption<McpToolOption>[] = useMemo(() => {
    return mcpTools.map((mcpTool) => ({
      label: mcpTool.name,
      value: {
        ...mcpTool,
        shortDescription: truncateAtSentence(mcpTool.description),
      },
      'data-test-subj': `mcpToolOption-${mcpTool.name}`,
    }));
  }, [mcpTools]);

  const renderMcpToolOption = useCallback(
    (
      option: EuiComboBoxOptionOption<McpToolOption>,
      searchValue: string,
      contentClassName: string
    ) => {
      return (
        <EuiFlexGroup direction="column" gutterSize="xs" className={contentClassName}>
          <EuiText size="s">
            <strong>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </strong>
          </EuiText>
          {option.value?.shortDescription && (
            <EuiText size="xs" color="subdued">
              <EuiHighlight search={searchValue}>{option.value.shortDescription}</EuiHighlight>
            </EuiText>
          )}
        </EuiFlexGroup>
      );
    },
    []
  );

  const isMcpToolsDisabled =
    !connectorId || isLoadingMcpTools || mcpHealthStatus !== McpToolHealthStatus.Healthy;

  return (
    <>
      {mcpHealthStatus && (
        <McpHealthBanner status={mcpHealthStatus} onViewMcpServer={openEditMcpServerFlyout} />
      )}
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFormRow
          label={i18nMessages.configuration.form.mcp.connectorLabel}
          isInvalid={!!errors.connectorId}
          error={errors.connectorId?.message}
          labelAppend={
            <EuiLink onClick={openCreateMcpServerFlyout} css={mcpActionLinkStyles(euiThemeContext)}>
              {i18nMessages.configuration.form.mcp.addMcpServerButtonLabel}
            </EuiLink>
          }
        >
          <Controller
            control={control}
            name="connectorId"
            render={({ field: { value, onChange, onBlur, ref, ...field } }) => (
              <EuiComboBox
                data-test-subj="agentBuilderMcpConnectorSelect"
                isInvalid={!!errors.connectorId}
                fullWidth
                singleSelection={{
                  asPlainText: true,
                }}
                options={connectorOptions}
                selectedOptions={connectorOptions.filter((connector) => connector.value === value)}
                onChange={(selectedOptions) => {
                  const [selectedConnectorOption] = selectedOptions;
                  onChange(selectedConnectorOption.value);
                  onBlur();
                }}
                isLoading={isLoadingConnectors}
                inputRef={ref}
                isClearable={false}
                onBlur={onBlur}
                {...field}
              />
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18nMessages.configuration.form.mcp.mcpToolLabel}
          isInvalid={!!errors.mcpToolName}
          error={errors.mcpToolName?.message}
          labelAppend={
            <EuiLink onClick={handleBulkImportClick} css={mcpActionLinkStyles(euiThemeContext)}>
              {i18nMessages.configuration.form.mcp.bulkImportMcpToolsButtonLabel}
            </EuiLink>
          }
        >
          <Controller
            control={control}
            name="mcpToolName"
            render={({ field: { value, onChange, onBlur, ref, ...field } }) => (
              <EuiComboBox
                data-test-subj="agentBuilderMcpToolSelect"
                isInvalid={!!errors.mcpToolName}
                fullWidth
                singleSelection={{
                  asPlainText: true,
                }}
                options={mcpToolOptions}
                selectedOptions={
                  value ? mcpToolOptions.filter((option) => option.value?.name === value) : []
                }
                onChange={(selectedOptions) => {
                  const [selectedMcpTool] = selectedOptions;
                  onChange(selectedMcpTool.value?.name);
                  onBlur();

                  // Update the tool ID and description
                  if (selectedMcpTool.value) {
                    const { name, description = '' } = selectedMcpTool.value;
                    setValue('toolId', name, { shouldValidate: true });
                    setValue('description', description, { shouldValidate: true });
                  }
                }}
                isLoading={!!connectorId && isLoadingMcpTools}
                isDisabled={isMcpToolsDisabled}
                inputRef={ref}
                isClearable={false}
                renderOption={renderMcpToolOption}
                rowHeight="auto"
                {...(!isMcpToolsDisabled ? { onBlur } : {})}
                {...field}
              />
            )}
          />
        </EuiFormRow>
      </EuiFlexGroup>
      {isCreateMcpServerFlyoutOpen && createMcpServerFlyout}
      {isEditMcpServerFlyoutOpen && editMcpServerFlyout}
    </>
  );
};
