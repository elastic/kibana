/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { createActorContext } from '@xstate/react';
import type { XYPosition } from '@xyflow/react';
import type { CanvasStateServiceDeps } from './types';
import { canvasStateMachine, createCanvasMachineImplementations } from './canvas_state_machine';

const CanvasStateContext = createActorContext(canvasStateMachine);

const useCanvasStateSelector = CanvasStateContext.useSelector;

export const CanvasStateContextProvider = ({
  children,
  ...deps
}: React.PropsWithChildren<CanvasStateServiceDeps>) => {
  return (
    <CanvasStateContext.Provider
      logic={canvasStateMachine.provide(createCanvasMachineImplementations(deps))}
    >
      {children}
    </CanvasStateContext.Provider>
  );
};

export const useCanvasUrlRef = () => {
  return useCanvasStateSelector((state) => state.context.urlState);
};

export const useCanvasUnitDefinition = () => {
  return useCanvasStateSelector((state) => state.context.nextUnit);
};

export const useCanvasHasUnsavedChanges = () => {
  return useCanvasStateSelector((state) => state.context.unit !== state.context.nextUnit);
};

export const useCanvasIsSaving = () => {
  return useCanvasStateSelector(
    (state) =>
      state.matches({ ready: { unit: 'validating' } }) ||
      state.matches({ ready: { unit: 'persisting' } })
  );
};

export const useCanvasIsInitializing = () => {
  return useCanvasStateSelector(
    (state) => state.matches('initializingFromUrl') || state.matches({ ready: { unit: 'loading' } })
  );
};

export const useCanvasIsUnitUnavailable = () => {
  return useCanvasStateSelector((state) => state.matches({ ready: { unit: 'loadFailed' } }));
};

export const useCanvasSourcesRef = () => {
  return useCanvasStateSelector((state) => state.context.sourcesRef);
};

export const useCanvasNodePositions = () => {
  return useCanvasStateSelector((state) => state.context.nodePositions);
};

export const useGetCanvasState = () => {
  const service = CanvasStateContext.useActorRef();
  return useCallback(() => service.getSnapshot(), [service]);
};

export const useCanvasEvents = () => {
  const service = CanvasStateContext.useActorRef();

  return useMemo(
    () => ({
      service,
      openFlyout: (flyoutName: string) => {
        service.send({ type: 'flyout.open', flyoutName });
      },
      closeFlyout: () => {
        service.send({ type: 'flyout.close' });
      },
      selectTab: (flyoutTab: string) => {
        service.send({ type: 'flyout.tab', flyoutTab });
      },
      updateNodePositions: (positions: Record<string, XYPosition>) => {
        service.send({ type: 'nodes.positions.change', positions });
      },
      saveUnit: () => {
        service.send({ type: 'unit.save' });
      },
    }),
    [service]
  );
};
