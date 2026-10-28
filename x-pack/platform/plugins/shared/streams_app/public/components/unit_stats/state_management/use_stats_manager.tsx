/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useId, useMemo } from 'react';
import { createActorContext } from '@xstate/react';
import type { StreamsUnit } from '@kbn/streams-schema';
import type { Observable } from 'rxjs';
import { NEVER } from 'rxjs';
import { useKibana } from '../../../hooks/use_kibana';
import type {
  DestinationStatsView,
  ProcessorStatsView,
  StatsWindow,
} from '../../../services/unit_stats_client/types';
import { createUnitStatsClient } from '../../../services/unit_stats_client/unit_stats_client';
import { createStatsManagerImplementations, statsManagerMachine } from './stats_manager_machine';
import type { StatsEntry } from './types';

const StatsManagerContext = createActorContext(statsManagerMachine);

const DEFAULT_WINDOW: StatsWindow = { kind: 'default' };
const getDefaultWindow = (): StatsWindow => DEFAULT_WINDOW;

export interface StatsManagerProviderProps {
  /** The unit that the stats are for. A different unit needs a new provider, so key it by the unit. */
  unitId: string;
  /** Resolves the window to fetch at every flush. Omit it for the server default. */
  getWindow?: () => StatsWindow;
  /** How often to ask for every shown component again. Omit it for no polling. */
  pollIntervalMs?: number;
  /** The shared time state. Omit it for a view without a picker, such as the Map. */
  timeState$?: Observable<unknown>;
}

/**
 * Runs one stats manager for a view. The manager is created once, when the provider mounts, and
 * stops with it, which stops its polling and aborts any request in flight.
 */
export const StatsManagerProvider = ({
  unitId,
  getWindow = getDefaultWindow,
  pollIntervalMs,
  timeState$ = NEVER,
  children,
}: React.PropsWithChildren<StatsManagerProviderProps>) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const logic = useMemo(
    () =>
      statsManagerMachine.provide(
        createStatsManagerImplementations({
          client: createUnitStatsClient({ streamsRepositoryClient, unitId }),
          timeState$,
        })
      ),
    [streamsRepositoryClient, unitId, timeState$]
  );

  return (
    <StatsManagerContext.Provider logic={logic} options={{ input: { getWindow, pollIntervalMs } }}>
      {children}
    </StatsManagerContext.Provider>
  );
};

/**
 * Shows a component to the manager while the caller is mounted. The registrant is made here, so a
 * repeated registration of the same caller changes nothing, and a caller never removes the
 * interest of another one. Nothing is registered while the id is undefined.
 */
const useRegisteredComponent = (kind: StreamsUnit.StatsComponentRef['kind'], id?: string) => {
  const actorRef = StatsManagerContext.useActorRef();
  const registrant = useId();

  useEffect(() => {
    if (id === undefined) return;

    const ref = { kind, id };
    actorRef.send({ type: 'stats.register', ref, registrant });
    return () => {
      actorRef.send({ type: 'stats.unregister', ref, registrant });
    };
  }, [actorRef, kind, id, registrant]);
};

/**
 * The stats of a destination, or `undefined` until the first result arrives. It only reads: the
 * manager decides when to fetch. The entry is the stored object, so a refresh that returns equal
 * values does not re-render the caller.
 */
export const useDestinationStats = (
  id: string | undefined
): StatsEntry<DestinationStatsView> | undefined => {
  useRegisteredComponent('destination', id);

  return StatsManagerContext.useSelector((state) =>
    id === undefined ? undefined : state.context.components.destination[id]?.entry
  );
};

/** The stats of a processor, with one instance per place it runs. See `useDestinationStats`. */
export const useProcessorStats = (
  id: string | undefined
): StatsEntry<ProcessorStatsView> | undefined => {
  useRegisteredComponent('processor', id);

  return StatsManagerContext.useSelector((state) =>
    id === undefined ? undefined : state.context.components.processor[id]?.entry
  );
};

/** For a refresh button. A refresh asks again for everything shown, and restarts polling. */
export const useStatsRefresh = () => {
  const actorRef = StatsManagerContext.useActorRef();
  const isRefreshing = StatsManagerContext.useSelector((state) =>
    state.matches({ request: 'fetching' })
  );
  const lastUpdated = StatsManagerContext.useSelector((state) => state.context.lastUpdated);
  const refresh = useCallback(() => actorRef.send({ type: 'stats.refresh' }), [actorRef]);

  return { refresh, isRefreshing, lastUpdated };
};

/** For the code that owns the unit: tells the manager that a unit was saved. */
export const useStatsUnitPersisted = () => {
  const actorRef = StatsManagerContext.useActorRef();

  return useCallback(
    (componentIds: string[]) => actorRef.send({ type: 'stats.unitPersisted', componentIds }),
    [actorRef]
  );
};
