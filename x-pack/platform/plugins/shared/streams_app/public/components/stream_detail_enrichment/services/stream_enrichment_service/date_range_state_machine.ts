/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActorRef,
  MachineImplementationsFrom,
  Snapshot,
  assertEvent,
  assign,
  fromObservable,
  sendTo,
  setup,
} from 'xstate5';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import { getPlaceholderFor } from '@kbn/xstate-utils';

export interface DateRangeToParentEvent {
  type: 'dateRange.update';
}

export type DateRangeParentActor = ActorRef<Snapshot<unknown>, DateRangeToParentEvent>;

export interface DateRangeContext {
  parentRef: DateRangeParentActor;
  timeRange: TimeRange;
  absoluteTimeRange: {
    start?: number;
    end?: number;
  };
}

type DateRangeEvent =
  | { type: 'dateRange.refresh' }
  | { type: 'dateRange.update'; range: TimeRange };

export const dateRangeMachine = setup({
  types: {
    context: {} as DateRangeContext,
    events: {} as DateRangeEvent,
    input: {} as {
      parentRef: DateRangeParentActor;
    },
  },
  actors: {
    subscribeTimeUpdates: getPlaceholderFor(createTimeUpdatesActor),
  },
  actions: {
    setTimeUpdates: () => {},
    storeTimeUpdates: () => {},
    emitDateRangeUpdate: sendTo(({ context }) => context.parentRef, { type: 'dateRange.update' }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcwCUUDsYGJUNs8wA6AVwAciwBtABgF1FQqB7WASzS-Z1YgAHogDMDMgwCMUgOxSAnAFY5AFgYLZs0QBoQAT0QBaKUrKilC0bKUBfe3pzsIcQbRIxBHbr36CRCFIAbGQKYeER4bJ6hoFSomSqSqJSDAAcSkHqigBM9vZAA */
  id: 'dateRange',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    timeRange: {
      from: '',
      to: '',
    },
    absoluteTimeRange: {
      start: 0,
      end: 0,
    },
  }),
  entry: 'storeTimeUpdates',
  invoke: {
    src: 'subscribeTimeUpdates',
    onSnapshot: {
      actions: [{ type: 'storeTimeUpdates' }, { type: 'emitDateRangeUpdate' }],
    },
  },
  on: {
    'dateRange.update': {
      actions: [{ type: 'setTimeUpdates' }],
    },
    'dateRange.refresh': {
      actions: [{ type: 'storeTimeUpdates' }, { type: 'emitDateRangeUpdate' }],
    },
  },
});

export const createDateRangeMachineImplementations = ({
  data,
}: {
  data: DataPublicPluginStart;
}): MachineImplementationsFrom<typeof dateRangeMachine> => ({
  actors: {
    subscribeTimeUpdates: createTimeUpdatesActor({ data }),
  },
  actions: {
    setTimeUpdates: ({ event }: { event: DateRangeEvent }) => {
      assertEvent(event, 'dateRange.update');
      data.query.timefilter.timefilter.setTime(event.range);
    },
    storeTimeUpdates: assign(() => getTimeContextFromService(data.query.timefilter.timefilter)),
  },
});

function createTimeUpdatesActor({ data }: { data: DataPublicPluginStart }) {
  return fromObservable(() => data.query.timefilter.timefilter.getTimeUpdate$());
}

function getTimeContextFromService(timefilter: TimefilterContract) {
  return {
    timeRange: timefilter.getTime(),
    absoluteTimeRange: {
      start: new Date(timefilter.getAbsoluteTime().from).getTime(),
      end: new Date(timefilter.getAbsoluteTime().to).getTime(),
    },
  };
}
