/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BehaviorSubject, Subject, of } from 'rxjs';

import type { SerializedTimeRange, ViewMode } from '@kbn/presentation-publishing';

import { embeddableInputToExpression } from '../../../canvas_plugin_src/renderers/embeddable/embeddable_input_to_expression';
import type { CanvasContainerApi } from '../../../types';
import { METRIC_TYPE, trackCanvasUiMetric } from '../../lib/ui_metric';
// @ts-expect-error unconverted file
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { CANVAS_APP } from '../../../common/lib';
import { coreServices, dataService } from '../../services/kibana_services';

const reload$ = new Subject<void>();

// Canvas does not provide the global time range
// To ensure embeddables have consistent time range from editor,
// provide global time range in embeddable state when not provided.
export function ensureTimeRange(
  embeddableState: SerializedTimeRange
): Required<SerializedTimeRange> {
  if (embeddableState.time_range) {
    return embeddableState as Required<SerializedTimeRange>;
  }

  const time = dataService.query.timefilter.timefilter.getTime();
  return {
    ...embeddableState,
    time_range: {
      from: time.from,
      to: time.to,
    },
  };
}

export function forceReload() {
  reload$.next();
}

export const useCanvasApi: () => CanvasContainerApi = () => {
  const selectedPageId = useSelector(getSelectedPage);
  const dispatch = useDispatch();

  const createNewEmbeddable = useCallback(
    (type: string, embeddableInput: object) => {
      if (trackCanvasUiMetric) {
        trackCanvasUiMetric(METRIC_TYPE.CLICK, type);
      }
      if (embeddableInput) {
        const expression = embeddableInputToExpression(ensureTimeRange(embeddableInput), type);
        dispatch(addElement(selectedPageId, { expression }));
      }
    },
    [selectedPageId, dispatch]
  );

  const getCanvasApi = useCallback((): CanvasContainerApi => {
    const panelStateMap: Record<string, BehaviorSubject<object>> = {};

    function getSerializedStateForChild(childId: string) {
      return panelStateMap[childId]?.value ?? {};
    }

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
      viewMode$: new BehaviorSubject<ViewMode>('edit'), // always in edit mode
      addNewPanel: async ({
        panelType,
        serializedState,
      }: {
        panelType: string;
        serializedState: object;
      }) => {
        createNewEmbeddable(panelType, serializedState);
      },
      disableTriggers: true,
      // this is required to disable inline editing now enabled by default
      canEditInline: false,
      type: 'canvas',
      getSerializedStateForChild,
      lastSavedStateForChild$: (childId: string) => panelStateMap[childId] ?? of(undefined),
      // Canvas auto saves so lastSavedState is the same as currentState
      getLastSavedStateForChild: getSerializedStateForChild,
      setSerializedStateForChild: (childId: string, serializePanelState: object) => {
        if (!panelStateMap[childId]) {
          panelStateMap[childId] = new BehaviorSubject(serializePanelState);
          return;
        }
        panelStateMap[childId].next(serializePanelState);
      },
    } as CanvasContainerApi;
  }, [createNewEmbeddable]);

  return useMemo(() => getCanvasApi(), [getCanvasApi]);
};
