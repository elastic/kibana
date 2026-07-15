/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { labels } from '../../../../utils/i18n';
import { WorkflowPicker } from '../../../tools/form/components/workflow/workflow_picker';
import { useUiPrivileges } from '../../../../hooks/use_ui_privileges';
import type { EditDetailsFormData } from './types';

const { editDetails: flyoutLabels } = labels.agentOverview;

interface CustomizationSectionProps {
  showWorkflowSection: boolean;
}

export const CustomizationSection: React.FC<CustomizationSectionProps> = ({
  showWorkflowSection,
}) => {
  const { control } = useFormContext<EditDetailsFormData>();
  const { isAdmin } = useUiPrivileges();

  return (
    <>
      <EuiTitle size="xs">
        <h3>{flyoutLabels.customizationTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued" component="p">
        {flyoutLabels.customizationDescription}
      </EuiText>
      <EuiSpacer size="l" />

      <EuiPanel hasBorder paddingSize="l">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow>
            <EuiTitle size="xxs">
              <h4>{flyoutLabels.autoIncludeTitle}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              {flyoutLabels.autoIncludeDescription}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Controller
              name="configuration.enable_elastic_capabilities"
              control={control}
              render={({ field: { onChange, value } }) => (
                <EuiSwitch
                  label={flyoutLabels.autoIncludeLabel}
                  showLabel={false}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  data-test-subj="editDetailsAutoIncludeSwitch"
                  {...getEbtProps({
                    element: AGENT_BUILDER_UI_EBT.element.flyout,
                    action: AGENT_BUILDER_UI_EBT.action.agentOverview.ELASTIC_CAPABILITIES_TOGGLE,
                    detail: AGENT_BUILDER_UI_EBT.entity.AGENT,
                  })}
                />
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {showWorkflowSection && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder paddingSize="l">
            <EuiTitle size="xxs">
              <h4>{flyoutLabels.workflowTitle}</h4>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              {flyoutLabels.workflowDescription}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFormRow
              label={flyoutLabels.workflowLabel}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {labels.common.optional}
                </EuiText>
              }
              helpText={!isAdmin ? flyoutLabels.workflowAdminOnlyReason : undefined}
              fullWidth
            >
              <WorkflowPicker
                name="configuration.workflow_ids"
                singleSelection={false}
                isDisabled={!isAdmin}
              />
            </EuiFormRow>
          </EuiPanel>
        </>
      )}
    </>
  );
};
