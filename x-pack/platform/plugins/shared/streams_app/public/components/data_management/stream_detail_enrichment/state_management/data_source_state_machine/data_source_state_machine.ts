/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRefFrom, assign, emit, forwardTo, sendTo, setup } from 'xstate5';
import { isEqual } from 'lodash';
import { DataSourceDefinition, getDataSourceType } from '@kbn/streams-schema';
import {
  DataSourceInput,
  DataSourceContext,
  DataSourceEvent,
  DataSourceEmittedEvent,
} from './types';

export type DataSourceActorRef = ActorRefFrom<typeof dataSourceMachine>;

export const dataSourceMachine = setup({
  types: {
    input: {} as DataSourceInput,
    context: {} as DataSourceContext,
    events: {} as DataSourceEvent,
    emitted: {} as DataSourceEmittedEvent,
  },
  actions: {
    changeDataSource: assign(({ context }, params: { dataSource: DataSourceDefinition }) => ({
      dataSource: {
        id: context.dataSource.id,
        type: getDataSourceType(params.dataSource),
        ...params.dataSource,
      },
    })),
    resetToPrevious: assign(({ context }) => ({
      dataSource: context.previousDataSource,
    })),
    markAsUpdated: assign(({ context }) => ({
      previousDataSource: context.dataSource,
      isUpdated: true,
    })),
    forwardEventToParent: forwardTo(({ context }) => context.parentRef),
    forwardChangeEventToParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'dataSource.change',
        id: context.dataSource.id,
      })
    ),
    notifyDataSourceDelete: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'dataSource.delete',
        id: context.dataSource.id,
      })
    ),
    emitChangesDiscarded: emit({ type: 'dataSource.changesDiscarded' }),
  },
  guards: {
    isDraft: ({ context }) => context.isNew,
    hasEditingChanges: ({ context }) => !isEqual(context.previousDataSource, context.dataSource),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcUGUD2BXATgMZgB0uAdvnNgDYBukAxANoAMAuoqAA7awCWaftnJcQAD0QBGAOwA2EjIDMAFiVzlM1nNYBWFTIA0IAJ6IATPpK6AvjeOoMOAsTKVq9JsymckIXgJCImKSCLIKymoaSlo6+kamiAAcUtZ2DuhYeESkEPgoAGZoJJCC-ORQjI5ZLqSwGDBsvjx8ZcF+oXJKSiSsKnJJ0bF6usZmCOZSrCRScnPzC3K65ukg1c45JHmFxaVCFVWZG66EKOTENE1iAW2iHdLaqSoAnDK6MuasswZyz2OIKj0M2W5iSz3Mr30SiSq3W2Vc2yKJQgZQOcNqJEIAAszo0ONdWkE7qBQqpnsC5OYVOYYto9AZ-hNfml7GsjvDSIQRAV+FACJASPwIDQwIcnBzkYIrn4bkSQg8EuMZDIkiRntpLLD2RiueQeXyqBBJbsUftKujNrhuI4wNKWoFhMSJADdLoSGCNaNEghXuT5LpKbZWRaTtzefyjXtjeVzdrNqdzmBLviZYTHfKECoVG6PYHGUkISRAYGteKdWGDQKo3sY2KapsIEmwGhbSn7bcM+Ceir1foksNXYypLIetSpP2gxky-GKxHjdG0XGTjiKq3mv40+0SdJqUPWN0ZsXNatyNhG-A-CGwASHVvnQgALRyRlP3qsd99fuAqSTGSl+uuBQVCwLQDAQDeHb3Jm5iMlSCjdAhiGIX+wZLrk+RFBBcpQUoXwUlSNIDgy3rjqkzzka8vxqOo0T-sc6E7AuUBYemUFjkWGr9OOui4eYyiMkorxqp6dESrq+oRixd6hP0jK-E8GrmFR3RzChU4AZys6GoKwrXqmt5OqESRAqC6p5t6SQFiQ3S6M8MSTmy06hnq4baXsUmGYgzwqIy3lunIxbPGCI79KJ5YuZWkamkxHkZpMKgkJYH7QlI-SvHxQ6zKk+gDG8YUNk2LbgfpkHbmEP7TDZ4JBQOXrjD+XSJZE9l2HYQA */
  id: 'dataSource',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previousDataSource: input.dataSource,
    dataSource: input.dataSource,
    isNew: input.isNew ?? false,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [{ target: 'draft', guard: 'isDraft' }, { target: 'configured' }],
    },
    draft: {
      initial: 'editing',
      states: {
        editing: {
          on: {
            'dataSource.stage': {
              target: '#configured',
              actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
            },
            'dataSource.cancel': {
              target: '#deleted',
              actions: [{ type: 'resetToPrevious' }],
            },
            'dataSource.change': {
              actions: [
                { type: 'changeDataSource', params: ({ event }) => event },
                { type: 'forwardChangeEventToParent' },
              ],
            },
          },
        },
      },
    },
    configured: {
      id: 'configured',
      initial: 'idle',
      states: {
        idle: {
          on: { 'dataSource.edit': 'edit' },
        },
        edit: {
          initial: 'editing',
          states: {
            editing: {
              on: {
                'dataSource.update': {
                  guard: 'hasEditingChanges',
                  target: '#configured.idle',
                  actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
                },
                'dataSource.cancel': {
                  target: '#configured.idle',
                  actions: [
                    { type: 'emitChangesDiscarded' },
                    { type: 'resetToPrevious' },
                    { type: 'forwardEventToParent' },
                  ],
                },
                'dataSource.delete': '#deleted',
                'dataSource.change': {
                  actions: [
                    { type: 'changeDataSource', params: ({ event }) => event },
                    { type: 'forwardChangeEventToParent' },
                  ],
                },
              },
            },
          },
        },
      },
    },
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [{ type: 'notifyDataSourceDelete' }],
    },
  },
});
