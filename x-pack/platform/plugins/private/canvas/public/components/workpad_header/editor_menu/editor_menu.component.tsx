/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';

import { EuiContextMenu } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolbarPopover } from '@kbn/shared-ux-button-toolbar';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public/actions';

import { addCanvasElementTrigger } from '../../../state/triggers/add_canvas_element_trigger';
import { useCanvasApi } from '../../hooks/use_canvas_api';

const strings = {
  getEditorMenuButtonLabel: () =>
    i18n.translate('xpack.canvas.solutionToolbar.editorMenuButtonLabel', {
      defaultMessage: 'Select type',
    }),
};

interface Props {
  addPanelActions: Action[];
  createNewEmbeddableFromAction: (
    action: Action,
    context: ActionExecutionContext<object>,
    closePopover: () => void
  ) => (event: React.MouseEvent) => void;
}

export const EditorMenu: FC<Props> = ({
  addPanelActions,
  createNewEmbeddableFromAction,
}: Props) => {
  const canvasApi = useCanvasApi();

  const getAddPanelActionMenuItems = useCallback(
    (closePopover: () => void) => {
      return addPanelActions.map((item) => {
        const context = {
          embeddable: canvasApi,
          trigger: addCanvasElementTrigger,
        };
        const actionName = item.getDisplayName(context);
        return {
          name: actionName,
          icon: item.getIconType(context),
          onClick: createNewEmbeddableFromAction(item, context, closePopover),
          'data-test-subj': `create-action-${actionName}`,
          toolTipContent: item?.getDisplayNameTooltip?.(context),
          order: item.order ?? 0,
        };
      });
    },
    [addPanelActions, createNewEmbeddableFromAction, canvasApi]
  );

  const getEditorMenuPanels = (closePopover: () => void) => [
    {
      id: 0,
      items: [...getAddPanelActionMenuItems(closePopover).sort((a, b) => b.order - a.order)],
    },
  ];

  return (
    <ToolbarPopover
      ownFocus
      label={strings.getEditorMenuButtonLabel()}
      panelPaddingSize="none"
      data-test-subj="canvasEditorMenuButton"
    >
      {({ closePopover }: { closePopover: () => void }) => (
        <EuiContextMenu
          initialPanelId={0}
          panels={getEditorMenuPanels(closePopover)}
          data-test-subj="canvasEditorContextMenu"
        />
      )}
    </ToolbarPopover>
  );
};
