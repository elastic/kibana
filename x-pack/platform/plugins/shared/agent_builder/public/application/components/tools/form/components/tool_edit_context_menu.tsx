/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useNavigation } from '../../../../hooks/use_navigation';
import { useToolsActions } from '../../../../context/tools_provider';
import { labels } from '../../../../utils/i18n';
import type { ToolFormData } from '../types/tool_form_types';
import { appPaths } from '../../../../utils/app_paths';

export const ToolEditContextMenu = () => {
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { cloneTool, deleteTool } = useToolsActions();
  const { control } = useFormContext<ToolFormData>();
  const toolId = useWatch({ name: 'toolId', control });
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      panelPaddingSize="xs"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      zIndex={Number(euiTheme.levels.header) - 1}
      button={
        <EuiButtonIcon
          data-test-subj="agentBuilderToolContextMenuButton"
          size="m"
          iconType="boxesVertical"
          onClick={() => setIsOpen((openState) => !openState)}
          aria-label={labels.tools.editToolContextMenuButtonLabel}
        />
      }
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            data-test-subj="agentBuilderToolCloneButton"
            key="clone"
            icon="copy"
            size="s"
            onClick={() => {
              cloneTool(toolId);
            }}
          >
            {labels.tools.cloneToolButtonLabel}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="agentBuilderToolDeleteButton"
            key="delete"
            icon="trash"
            size="s"
            css={css`
              color: ${euiTheme.colors.textDanger};
            `}
            onClick={() => {
              setIsOpen(false);
              deleteTool(toolId, {
                onConfirm: () => navigateToAgentBuilderUrl(appPaths.tools.list),
              });
            }}
          >
            {labels.tools.deleteToolButtonLabel}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
