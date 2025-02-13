/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BehaviorSubject, Subject } from 'rxjs';

import { EmbeddableInput } from '@kbn/embeddable-plugin/common';
import { ViewMode } from '@kbn/presentation-publishing';

import { embeddableInputToExpression } from '../../../canvas_plugin_src/renderers/embeddable/embeddable_input_to_expression';
import { CanvasContainerApi } from '../../../types';
import { METRIC_TYPE, trackCanvasUiMetric } from '../../lib/ui_metric';
// @ts-expect-error unconverted file
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { CANVAS_APP } from '../../../common/lib';
import { coreServices } from '../../services/kibana_services';

const reload$ = new Subject<void>();

export const useCanvasApi: () => CanvasContainerApi = () => {
  const selectedPageId = useSelector(getSelectedPage);
  const dispatch = useDispatch();

  const createNewEmbeddable = useCallback(
    (type: string, embeddableInput: EmbeddableInput) => {
      if (trackCanvasUiMetric) {
        trackCanvasUiMetric(METRIC_TYPE.CLICK, type);
      }
      if (embeddableInput) {
        const expression = embeddableInputToExpression(embeddableInput, type, undefined, true);
        dispatch(addElement(selectedPageId, { expression }));
      }
    },
    [selectedPageId, dispatch]
  );

  const getCanvasApi = useCallback((): CanvasContainerApi => {
    return {
      getAppContext: () => ({
        getCurrentPath: () => {
          const urlToApp = coreServices.application.getUrlForApp(CANVAS_APP);
          const inAppPath = window.location.pathname.replace(urlToApp, '');
          return inAppPath + window.location.search + window.location.hash;
        },
        currentAppId: CANVAS_APP,
      }),
      reload$,
      reload: () => {
        reload$.next();
      },
      viewMode$: new BehaviorSubject<ViewMode>('edit'), // always in edit mode
      addNewPanel: async ({
        panelType,
        initialState,
      }: {
        panelType: string;
        initialState: EmbeddableInput;
      }) => {
        createNewEmbeddable(panelType, initialState);
      },
      disableTriggers: true,
      // this is required to disable inline editing now enabled by default
      canEditInline: false,
      type: 'canvas',
      /**
       * getSerializedStateForChild is left out here because we cannot access the state here. That method
       * is injected in `x-pack/plugins/canvas/canvas_plugin_src/renderers/embeddable/embeddable.tsx`
       */
    } as unknown as CanvasContainerApi;
  }, [createNewEmbeddable]);

  return useMemo(() => getCanvasApi(), [getCanvasApi]);
};
