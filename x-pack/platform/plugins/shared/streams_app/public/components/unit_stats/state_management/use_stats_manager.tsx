/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { createActorContext } from '@xstate/react';
import type { StreamsUnit } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import type { Observable } from 'rxjs';
import { NEVER } from 'rxjs';
import { useKibana } from '../../../hooks/use_kibana';
import type { ProcessingNodeRef } from '../../../services/unit_graph';
import type {
  DestinationStatsView,
  ProcessorStatsView,
  StatsWindow,
} from '../../../services/unit_stats_client/types';
import { createUnitStatsClient } from '../../../services/unit_stats_client/unit_stats_client';
import { getSlotStats, type SlotStats } from './get_slot_stats';
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

/** Keeps the previous reference while the value is equal, so a new array of the same ids is not a change. */
const useStableValue = <T,>(value: T): T => {
  const stable = useRef(value);
  if (!isEqual(stable.current, value)) {
    stable.current = value;
  }
  return stable.current;
};

/**
 * Shows components to the manager while the caller is mounted. The registrant is made here, so a
 * repeated registration of the same caller changes nothing, and a caller never removes the
 * interest of another one. Nothing is registered for an empty list.
 */
const useRegisteredComponents = (
  kind: StreamsUnit.StatsComponentRef['kind'],
  ids: readonly string[]
) => {
  const actorRef = StatsManagerContext.useActorRef();
  const registrant = useId();
  const stableIds = useStableValue(ids);

  useEffect(() => {
    const refs = stableIds.map((id) => ({ kind, id }));
    refs.forEach((ref) => actorRef.send({ type: 'stats.register', ref, registrant }));
    return () => {
      refs.forEach((ref) => actorRef.send({ type: 'stats.unregister', ref, registrant }));
    };
  }, [actorRef, kind, stableIds, registrant]);
};

/**
 * The stats of a destination, or `undefined` until the first result arrives. It only reads: the
 * manager decides when to fetch. The entry is the stored object, so a refresh that returns equal
 * values does not re-render the caller.
 */
export const useDestinationStats = (
  id: string | undefined
): StatsEntry<DestinationStatsView> | undefined => {
  useRegisteredComponents('destination', id === undefined ? [] : [id]);

  return StatsManagerContext.useSelector((state) =>
    id === undefined ? undefined : state.context.components.destination[id]?.entry
  );
};

/** The stats of a processor, with one instance per place it runs. See `useDestinationStats`. */
export const useProcessorStats = (
  id: string | undefined
): StatsEntry<ProcessorStatsView> | undefined => {
  useRegisteredComponents('processor', id === undefined ? [] : [id]);

  return StatsManagerContext.useSelector((state) =>
    id === undefined ? undefined : state.context.components.processor[id]?.entry
  );
};

const areEntriesEqual = (
  previous: ReadonlyArray<StatsEntry<ProcessorStatsView> | undefined>,
  next: ReadonlyArray<StatsEntry<ProcessorStatsView> | undefined>
): boolean =>
  previous.length === next.length && previous.every((entry, index) => entry === next[index]);

/**
 * The numbers of a processing node. `processorIds` is the slot's processors in the order they run.
 * An empty list registers nothing and gives `unknown`. It re-renders the caller only when one of
 * those processors gets a new entry.
 */
export const useSlotStats = ({
  ref,
  processorIds,
}: {
  ref: ProcessingNodeRef;
  processorIds: readonly string[];
}): SlotStats => {
  const stableIds = useStableValue(processorIds);
  const stableRef = useStableValue(ref);
  useRegisteredComponents('processor', stableIds);

  const entries = StatsManagerContext.useSelector(
    (state) => stableIds.map((id) => state.context.components.processor[id]?.entry),
    areEntriesEqual
  );

  return useMemo(() => getSlotStats(stableRef, entries), [stableRef, entries]);
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
