/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormProvider } from 'react-hook-form';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import type { CreateToolResponse } from '../../../../../common/http_api/tools';
import { labels } from '../../../utils/i18n';
import { useCreateTool } from '../../../hooks/tools/use_create_tools';
import { useToolForm } from '../../../hooks/tools/use_tool_form';
import { getCreatePayloadFromData } from '../../tools/form/registry/tools_form_registry';
import { ToolForm, ToolFormMode } from '../../tools/form/tool_form';
import type { ToolFormData } from '../../tools/form/types/tool_form_types';
import { FLYOUT_WIDTH } from '../common/constants';

interface ToolCreateFlyoutProps {
  onClose: () => void;
  onToolCreated?: (tool: CreateToolResponse) => void;
}

export const ToolCreateFlyout: React.FC<ToolCreateFlyoutProps> = ({ onClose, onToolCreated }) => {
  const { euiTheme } = useEuiTheme();
  const toolFormId = useGeneratedHtmlId({ prefix: 'toolCreateForm' });

  const form = useToolForm();
  const {
    handleSubmit,
    formState: { errors },
  } = form;

  const { isSubmitting, createTool } = useCreateTool({
    onSuccess: (response) => {
      onToolCreated?.(response);
      onClose();
    },
  });

  const onSubmit = useCallback(
    async (data: ToolFormData) => {
      await createTool(getCreatePayloadFromData(data));
    },
    [createTool]
  );

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <EuiFlyout onClose={onClose} size={FLYOUT_WIDTH} aria-labelledby="toolCreateFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="toolCreateFlyoutTitle">{labels.agentTools.createToolFlyoutTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {labels.agentTools.createToolFlyoutSubtitle}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiCallOut
        color="primary"
        title={labels.agentTools.createToolFlyoutCallout}
        css={css`
          padding-left: ${euiTheme.size.l};
        `}
      />
      <EuiSpacer size="m" />
      <EuiFlyoutBody>
        <FormProvider {...form}>
          <ToolForm mode={ToolFormMode.Create} formId={toolFormId} saveTool={onSubmit} />
        </FormProvider>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.flyout,
                action: AGENT_BUILDER_UI_EBT.action.libraryPanel.FLYOUT_CANCEL,
                detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              })}
            >
              {labels.tools.cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              disabled={hasErrors || isSubmitting}
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.flyout,
                action: AGENT_BUILDER_UI_EBT.action.libraryPanel.FLYOUT_SAVE,
                detail: AGENT_BUILDER_UI_EBT.entity.TOOL,
              })}
            >
              {labels.agentTools.saveAndAttachButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
