/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { createActorContext, useSelector } from '@xstate5/react';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { ActorOptions, ActorRef, Subscription, AnyActorLogic, StateMachine } from 'xstate5';
import { Selector, createSelector } from 'reselect';
import { BehaviorSubject } from 'rxjs';
import {
  streamEnrichmentMachine,
  createStreamEnrichmentMachineImplementations,
} from './stream_enrichment_state_machine';
import {
  StreamEnrichmentContextType,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { ProcessorActorRef } from '../processor_state_machine';
import {
  PreviewDocsFilterOption,
  SimulationActorSnapshot,
  filterSimulationDocuments,
} from '../simulation_state_machine';

const consoleInspector = createConsoleInspector();

// const StreamEnrichmentContext = createActorContext(streamEnrichmentMachine);

function withDerivedStore<
  TLogic extends AnyActorLogic,
  TContext extends TLogic extends StateMachine<
    infer C,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >
    ? C
    : never,
  TSelectors extends Record<string, Selector<TContext, any>>
>(
  context: ReturnType<typeof createActorContext<TLogic>>,
  selectors: TSelectors,
  subSubscribes?: (context: TContext) => Array<ActorRef<any, any, any>>
) {
  const SelectorContext = React.createContext<Record<string, BehaviorSubject<any>> | null>(null);
  const ProviderProvider: (props: {
    children: React.ReactNode;
    options?: ActorOptions<TLogic>;
    /** @deprecated Use `logic` instead. */
    machine?: never;
    logic?: TLogic;
  }) => React.ReactElement<any, any> = ({ children, options, logic }) => {
    return (
      <context.Provider options={options} logic={logic}>
        <SelectorProvider>{children}</SelectorProvider>
      </context.Provider>
    );
  };

  const SelectorProvider = ({ children }: { children: React.ReactNode }) => {
    const actor = context.useActorRef();
    const currentContextRef = React.useRef((actor?.getSnapshot() as { context: TContext }).context);

    useEffect(() => {
      const subscription = actor.subscribe((snapshot) => {
        currentContextRef.current = snapshot;
      });
      return () => {
        subscription.unsubscribe();
      };
    }, [actor]);

    const selectorSubjects = useMemo(() => {
      return Object.keys(selectors).reduce((acc, key) => {
        acc[key] = new BehaviorSubject(selectors[key](currentContextRef.current));
        return acc;
      }, {} as Record<string, BehaviorSubject<any>>);
    }, []);

    useEffect(() => {
      let activeSubscriptions: Subscription[] = [];
      let activeNestedActorRefs: Array<ActorRef<any, any, any>> = [];
      function update() {
        // no idea why this cast is necessary - maybe because not all actors have .context, only machines?
        const newContext = { ...(actor.getSnapshot() as { context: TContext }).context };
        currentContextRef.current = newContext;

        Object.entries(selectors).forEach(([key, selector]) => {
          const newValue = selector(newContext);
          if (selectorSubjects[key].value !== newValue) {
            selectorSubjects[key].next(newValue);
          }
        });
      }
      function updateSubSubscriptions() {
        if (!subSubscribes) {
          return;
        }
        const newSubs = subSubscribes(currentContextRef.current);
        // check whether the nested actor refs have changed. If yes, re-subscribe
        if (
          newSubs.length !== activeNestedActorRefs.length ||
          newSubs.some((sub, i) => sub !== activeNestedActorRefs[i])
        ) {
          activeNestedActorRefs = newSubs;
          activeSubscriptions.forEach((sub) => sub.unsubscribe());
          activeSubscriptions = [];
          activeSubscriptions = newSubs.map((sub) => sub.subscribe(update));
        }
      }
      const subscription = actor.subscribe(() => {
        update();
        updateSubSubscriptions();
      });

      return () => {
        subscription.unsubscribe();
        activeSubscriptions.forEach((sub) => sub.unsubscribe());
      };
    }, [actor, selectorSubjects]);

    return <SelectorContext.Provider value={selectorSubjects}>{children}</SelectorContext.Provider>;
  };

  const useDerivedStore = <K extends keyof TSelectors>(key: K): ReturnType<TSelectors[K]> => {
    const selectorSubjects = useContext(SelectorContext);
    if (!selectorSubjects) {
      throw new Error('useReselectSelector must be used within a Provider from withDerivedStore');
    }

    const currentSubject: BehaviorSubject<ReturnType<TSelectors[K]>> = (selectorSubjects as any)[
      key
    ];

    const [value, setValue] = useState(currentSubject.value);

    useEffect(() => {
      const subscription = currentSubject.subscribe(setValue);
      return () => subscription.unsubscribe();
    }, [currentSubject, key, selectorSubjects]);

    return value;
  };

  return { ...context, Provider: ProviderProvider, useDerivedStore };
}

const StreamEnrichmentContext = withDerivedStore(
  createActorContext(streamEnrichmentMachine),
  {
    derivedSamples: createSelector(
      [
        (ctx: StreamEnrichmentContextType) => {
          return ctx.simulatorRef?.getSnapshot().context.samples;
        },
        (ctx: StreamEnrichmentContextType) =>
          ctx.simulatorRef?.getSnapshot().context.previewDocsFilter,
        (ctx: StreamEnrichmentContextType) =>
          ctx.simulatorRef?.getSnapshot().context.simulation?.documents,
      ],
      (samples, previewDocsFilter, documents) => {
        return (
          (previewDocsFilter && documents
            ? filterSimulationDocuments(documents, previewDocsFilter)
            : samples) || []
        );
      }
    ),
  },
  (context) => (context.simulatorRef ? [context.simulatorRef] : [])
);

export const useStreamsEnrichmentSelector = StreamEnrichmentContext.useSelector;
export const useStreamsEnrichmentReselectSelector = StreamEnrichmentContext.useDerivedStore;

export type StreamEnrichmentEvents = ReturnType<typeof useStreamEnrichmentEvents>;

export const useStreamEnrichmentEvents = () => {
  const service = StreamEnrichmentContext.useActorRef();

  return useMemo(
    () => ({
      addProcessor: (processor: ProcessorDefinitionWithUIAttributes) => {
        service.send({ type: 'processors.add', processor });
      },
      reorderProcessors: (processorsRefs: ProcessorActorRef[]) => {
        service.send({ type: 'processors.reorder', processorsRefs });
      },
      resetChanges: () => {
        service.send({ type: 'stream.reset' });
      },
      saveChanges: () => {
        service.send({ type: 'stream.update' });
      },
      viewSimulationPreviewData: () => {
        service.send({ type: 'simulation.viewDataPreview' });
      },
      viewSimulationDetectedFields: () => {
        service.send({ type: 'simulation.viewDetectedFields' });
      },
      changePreviewDocsFilter: (filter: PreviewDocsFilterOption) => {
        service.send({ type: 'simulation.changePreviewDocsFilter', filter });
      },
    }),
    [service]
  );
};

export const StreamEnrichmentContextProvider = ({
  children,
  definition,
  ...deps
}: React.PropsWithChildren<StreamEnrichmentServiceDependencies & StreamEnrichmentInput>) => {
  return (
    <StreamEnrichmentContext.Provider
      logic={streamEnrichmentMachine.provide(createStreamEnrichmentMachineImplementations(deps))}
      options={{
        id: 'streamEnrichment',
        inspect: consoleInspector,
        input: {
          definition,
        },
      }}
    >
      <ListenForDefinitionChanges definition={definition}>{children}</ListenForDefinitionChanges>
    </StreamEnrichmentContext.Provider>
  );
};

const ListenForDefinitionChanges = ({
  children,
  definition,
}: React.PropsWithChildren<StreamEnrichmentInput>) => {
  const service = StreamEnrichmentContext.useActorRef();

  useEffect(() => {
    service.send({ type: 'stream.received', definition });
  }, [definition, service]);

  return children;
};

export const useSimulatorRef = () => {
  return useStreamsEnrichmentSelector((state) => state.context.simulatorRef);
};

export const useSimulatorSelector = <T,>(selector: (snapshot: SimulationActorSnapshot) => T): T => {
  const simulationRef = useSimulatorRef();

  if (!simulationRef) {
    throw new Error('useSimulatorSelector must be used within a StreamEnrichmentContextProvider');
  }

  return useSelector(simulationRef, selector);
};
