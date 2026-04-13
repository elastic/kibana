/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fromExpression } from '@kbn/interpreter';
import { CANVAS_APP } from '../../../../common/lib';
import { decode } from '../../../../common/lib/embeddable_dataurl';
import type { CanvasElement, CanvasPage } from '../../../../types';
// @ts-expect-error unconverted file
import { fetchAllRenderables } from '../../../state/actions/elements';
// @ts-expect-error unconverted file
import { selectToplevelNodes } from '../../../state/actions/transient';

import {
  updateEmbeddableExpression,
  fetchEmbeddableRenderable,
} from '../../../state/actions/embeddable';
import { clearValue } from '../../../state/actions/resolved_args';
import { embeddableInputToExpression } from '../../../../canvas_plugin_src/renderers/embeddable/embeddable_input_to_expression';
import { embeddableService, presentationUtilService } from '../../../services/kibana_services';
import { ensureTimeRange, useCanvasApi } from '../use_canvas_api';

export const useIncomingEmbeddable = (selectedPage: CanvasPage) => {
  const labsService = presentationUtilService.labsService;
  const dispatch = useDispatch();
  const isByValueEnabled = labsService.isProjectEnabled('labs:canvas:byValueEmbeddable');
  const stateTransferService = embeddableService.getStateTransfer();
  const container = useCanvasApi();

  // fetch incoming embeddables from state transfer service.
  const incomingEmbeddables = stateTransferService.getIncomingEmbeddablePackage(CANVAS_APP, true);

  useEffect(() => {
    if (isByValueEnabled && incomingEmbeddables?.length) {
      // handle each incoming embeddable
      incomingEmbeddables.forEach(({ embeddableId, serializedState: incomingState, type }) => {
        // retrieve existing element
        const originalElement = selectedPage.elements.find(
          ({ id }: CanvasElement) => id === embeddableId
        );

        if (originalElement) {
          const originalAst = fromExpression(originalElement!.expression);

          const functionIndex = originalAst.chain.findIndex(
            ({ function: fn }) => fn === 'embeddable'
          );

          if (functionIndex === -1) {
            dispatch(fetchAllRenderables());
            return;
          }

          const originalState = decode(
            originalAst.chain[functionIndex].arguments.config[0] as string
          );

          const originalType = originalAst.chain[functionIndex].arguments.type[0];

          // clear out resolved arg for old embeddable
          const argumentPath = [embeddableId, 'expressionRenderable'];
          dispatch(clearValue({ path: argumentPath }));

          let updatedState;

          // if type was changed, we should not provide originalInput
          if (originalType !== type) {
            updatedState = incomingState;
          } else {
            updatedState = { ...originalState, ...incomingState };
          }
          const expression = embeddableInputToExpression(ensureTimeRange(updatedState), type);

          dispatch(
            updateEmbeddableExpression({
              elementId: originalElement.id,
              embeddableExpression: expression,
            })
          );

          // update resolved args
          dispatch(fetchEmbeddableRenderable(originalElement.id));

          // select new embeddable element
          dispatch(selectToplevelNodes([embeddableId]));
        } else {
          container.addNewPanel({ panelType: type, serializedState: incomingState });
        }
      });
    }
  }, [dispatch, selectedPage, incomingEmbeddables, isByValueEnabled, container]);
};
