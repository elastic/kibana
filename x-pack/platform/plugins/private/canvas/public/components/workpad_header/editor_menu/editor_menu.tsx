/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public/actions';

import { ADD_CANVAS_ELEMENT_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { EditorMenu as Component } from './editor_menu.component';
import { useCanvasApi } from '../../hooks/use_canvas_api';
import { uiActionsService } from '../../../services/kibana_services';

export const EditorMenu: FC = () => {
  const canvasApi = useCanvasApi();

  const [addPanelActions, setAddPanelActions] = useState<Array<Action<object>>>([]);

  useEffect(() => {
    let mounted = true;
    async function loadPanelActions() {
      const registeredActions = await uiActionsService.getTriggerCompatibleActions(
        ADD_CANVAS_ELEMENT_TRIGGER,
        { embeddable: canvasApi }
      );
      if (mounted) setAddPanelActions(registeredActions);
    }
    loadPanelActions();
    return () => {
      mounted = false;
    };
  }, [canvasApi]);

  const createNewEmbeddableFromAction = useCallback(
    (action: Action, context: ActionExecutionContext<object>, closePopover: () => void) =>
      (event: React.MouseEvent) => {
        closePopover();
        if (event.currentTarget instanceof HTMLAnchorElement) {
          if (
            !event.defaultPrevented && // onClick prevented default
            event.button === 0 &&
            (!event.currentTarget.target || event.currentTarget.target === '_self') &&
            !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
          ) {
            event.preventDefault();
            action.execute(context);
          }
        } else action.execute(context);
      },
    []
  );

  return (
    <Component
      createNewEmbeddableFromAction={createNewEmbeddableFromAction}
      addPanelActions={addPanelActions}
    />
  );
};
