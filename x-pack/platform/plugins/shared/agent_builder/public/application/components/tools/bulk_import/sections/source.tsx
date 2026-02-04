/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption, UseEuiTheme } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiLink, euiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE } from '@kbn/connector-schemas/mcp/constants';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useListConnectors, useListMcpTools } from '../../../../hooks/tools/use_mcp_connectors';
import { labels } from '../../../../utils/i18n';
import { ToolFormSection } from '../../form/components/tool_form_section';
import { useAddMcpServerFlyout } from '../../form/hooks/use_add_mcp_server_flyout';
import type { BulkImportMcpToolsFormData } from '../types';
import { McpToolsSelectionTable } from '../mcp_tools_selection_table';

const mcpActionLinkStyles = (euiThemeContext: UseEuiTheme) => css`
  font-size: ${euiFontSize(euiThemeContext, 'xs').fontSize};
  font-weight: ${euiThemeContext.euiTheme.font.weight.semiBold};
`;

export const SourceSection = () => {
  const euiThemeContext = useEuiTheme();
  const { control, formState, setValue, trigger, getFieldState } =
    useFormContext<BulkImportMcpToolsFormData>();
  const { errors } = formState;

  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      setValue('connectorId', connector.id, { shouldValidate: true });
      // Clear tool selection when connector changes
      setValue('tools', []);
    },
    [setValue]
  );

  const {
    openFlyout: openCreateMcpServerFlyout,
    isOpen: isCreateMcpServerFlyoutOpen,
    flyout: createMcpServerFlyout,
  } = useAddMcpServerFlyout({ onConnectorCreated: handleConnectorCreated });

  const { connectors, isLoading: isLoadingConnectors } = useListConnectors({
    type: MCP_CONNECTOR_TYPE,
  });

  const connectorId = useWatch({ control, name: 'connectorId' });
  const selectedTools = useWatch({ control, name: 'tools' });
  const {
    mcpTools,
    isLoading: isLoadingMcpTools,
    isError: isErrorMcpTools,
  } = useListMcpTools({
    connectorId,
  });

  const connectorOptions: EuiComboBoxOptionOption<string>[] = useMemo(
    () =>
      connectors.map((connector) => ({
        label: connector.name,
        value: connector.id,
        'data-test-subj': `bulkImportMcpConnectorOption-${connector.id}`,
      })),
    [connectors]
  );

  return (
    <>
      <ToolFormSection
        title={labels.tools.bulkImportMcp.sourceSection.title}
        icon="download"
        description={labels.tools.bulkImportMcp.sourceSection.description}
      >
        <EuiFormRow
          label={labels.tools.bulkImportMcp.sourceSection.mcpServerLabel}
          isInvalid={!!errors.connectorId}
          error={errors.connectorId?.message}
          labelAppend={
            <EuiLink onClick={openCreateMcpServerFlyout} css={mcpActionLinkStyles(euiThemeContext)}>
              {labels.tools.bulkImportMcp.sourceSection.addMcpServerLink}
            </EuiLink>
          }
        >
          <Controller
            control={control}
            name="connectorId"
            render={({ field: { value, onChange, onBlur, ref, ...field } }) => (
              <EuiComboBox
                isInvalid={!!errors.connectorId}
                fullWidth
                singleSelection={{ asPlainText: true }}
                options={connectorOptions}
                selectedOptions={connectorOptions.filter((connector) => connector.value === value)}
                onChange={(selectedOptions) => {
                  const [selectedConnectorOption] = selectedOptions;
                  onChange(selectedConnectorOption.value);
                  onBlur();
                  // Clear tool selection when connector changes
                  setValue('tools', []);
                  if (getFieldState('namespace').isDirty) {
                    trigger('namespace');
                  }
                }}
                isLoading={isLoadingConnectors}
                inputRef={ref}
                isClearable={false}
                onBlur={onBlur}
                data-test-subj="bulkImportMcpConnectorSelect"
                {...field}
              />
            )}
          />
        </EuiFormRow>

        <EuiFormRow
          label={labels.tools.bulkImportMcp.sourceSection.toolsToImportLabel}
          fullWidth
          isInvalid={!!errors.tools}
          error={errors.tools?.message}
        >
          <Controller
            control={control}
            name="tools"
            render={({ field: { onChange } }) => (
              <McpToolsSelectionTable
                tools={mcpTools}
                selectedTools={selectedTools}
                onChange={(tools) => {
                  onChange(
                    tools.map((tool) => ({
                      name: tool.name,
                      description: tool.description,
                    }))
                  );
                }}
                isLoading={isLoadingMcpTools && !!connectorId}
                isError={isErrorMcpTools}
                isDisabled={!connectorId}
                disabledMessage={labels.tools.bulkImportMcp.sourceSection.selectMcpServerMessage}
              />
            )}
          />
        </EuiFormRow>
      </ToolFormSection>
      {isCreateMcpServerFlyoutOpen && createMcpServerFlyout}
    </>
  );
};
