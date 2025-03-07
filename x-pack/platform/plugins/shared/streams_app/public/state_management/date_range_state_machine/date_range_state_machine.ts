/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MachineImplementationsFrom,
  assertEvent,
  fromObservable,
  enqueueActions,
  setup,
  assign,
  ActorRefFrom,
} from 'xstate5';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { DateRangeContext, DateRangeEvent, DateRangeInput } from './types';

export type DateRangeActorRef = ActorRefFrom<typeof dateRangeMachine>;

export const dateRangeMachine = setup({
  types: {
    context: {} as DateRangeContext,
    events: {} as DateRangeEvent,
    input: {} as DateRangeInput,
  },
  actors: {
    subscribeTimeUpdates: getPlaceholderFor(createTimeUpdatesActor),
  },
  actions: {
    setTimeUpdates: () => {
      throw new Error('Not implemented');
    },
    storeTimeUpdates: () => {
      throw new Error('Not implemented');
    },
    notifyDateRangeUpdate: enqueueActions(({ enqueue, context }) => {
      if (context.parentRef) {
        enqueue.sendTo(context.parentRef, { type: 'dateRange.update' });
      }
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcwCUUDsYGJUNs8wA6AVwAciwBtABgF1FQqB7WASzS-Z1YgAHogBMANgCsZACwBmAOySANCACeiGQEYGZBQE5R+8QA4lAX3OraJAjdwwyAJzAAzF7AAWjFkhAduXn5BEQQAWjkZMn1jBn1FFXVEOX0FMjktcRkGcVFJSysQHHYIOEF7UkEAnj4BP1CtBVUNBFE5cTITSX15cQY5SS1JXPyCoA */
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
    id: 'dateRangeSubscriptionActor',
    src: 'subscribeTimeUpdates',
    onSnapshot: {
      actions: [{ type: 'storeTimeUpdates' }, { type: 'notifyDateRangeUpdate' }],
    },
  },
  on: {
    'dateRange.update': {
      actions: [{ type: 'setTimeUpdates' }],
    },
    'dateRange.refresh': {
      actions: [{ type: 'storeTimeUpdates' }, { type: 'notifyDateRangeUpdate' }],
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
