/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { ToolType } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';
import { ToolFormSection } from '../components/tool_form_section';
import { i18nMessages } from '../i18n';
import { useToolTypes } from '../../../../hooks/tools/use_tool_type_info';
import type { ToolFormData } from '../types/tool_form_types';
import { getToolTypeConfig, getEditableToolTypes } from '../registry/tools_form_registry';
import { ToolFormMode } from '../tool_form';

const TECH_PREVIEW_LABEL = i18n.translate('xpack.agentBuilder.tools.techPreviewBadgeLabel', {
  defaultMessage: 'Tech preview',
});

export interface TypeProps {
  mode: ToolFormMode;
}

export const TypeSection = ({ mode }: TypeProps) => {
  const {
    formState: { errors },
    control,
  } = useFormContext<ToolFormData>();
  const type = useWatch({ control, name: 'type' });
  const { docLinksService } = useAgentBuilderServices();

  const toolConfig = getToolTypeConfig(type);
  const ConfigurationComponent = useMemo(() => {
    return toolConfig.getConfigurationComponent();
  }, [toolConfig]);

  const { toolTypes: serverToolTypes, isLoading: toolTypesLoading } = useToolTypes();

  const editableToolTypes = useMemo(() => {
    let editableTypes = getEditableToolTypes();
    if (!toolTypesLoading && serverToolTypes) {
      const serverEnabledEditableTypes = serverToolTypes
        .filter((st) => st.create)
        .map((st) => st.type);

      editableTypes = editableTypes.filter((t) => serverEnabledEditableTypes.includes(t.value));
    }
    return editableTypes.map((t) => ({
      value: t.value,
      inputDisplay: t.text,
      'data-test-subj': `agentBuilderToolTypeOption-${t.value}`,
      dropdownDisplay: (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>{t.text}</EuiFlexItem>
          {t.value === ToolType.mcp && (
            <EuiFlexItem grow={false}>
              <EuiBetaBadge iconType="flask" label={TECH_PREVIEW_LABEL} size="s" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    }));
  }, [serverToolTypes, toolTypesLoading]);

  return (
    <ToolFormSection
      title={i18nMessages.configuration.documentation.title}
      icon="code"
      description={i18nMessages.configuration.documentation.description}
      documentation={{
        title: i18nMessages.configuration.documentation.documentationLink,
        href: docLinksService.tools,
      }}
    >
      <EuiFormRow label={i18nMessages.configuration.form.type.label} error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => (
            <EuiSuperSelect
              data-test-subj="agentBuilderToolTypeSelect"
              options={editableToolTypes}
              valueOfSelected={value}
              onChange={onChange}
              disabled={mode === ToolFormMode.Edit}
              fullWidth
            />
          )}
        />
      </EuiFormRow>
      <ConfigurationComponent mode={mode} />
    </ToolFormSection>
  );
};
