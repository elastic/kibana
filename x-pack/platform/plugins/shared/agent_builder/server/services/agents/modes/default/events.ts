/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderEvent } from '@kbn/agent-builder-common';
import type { StateType } from './state';

export enum AgentExecutionEventType {
  finalState = 'final_state',
}

export interface FinalStateEventData {
  state: StateType;
}

export type FinalStateEvent = AgentBuilderEvent<
  AgentExecutionEventType.finalState,
  FinalStateEventData
>;

export const isFinalStateEvent = (event: AgentBuilderEvent<any, any>): event is FinalStateEvent => {
  return event.type === AgentExecutionEventType.finalState;
};

export const createFinalStateEvent = (state: StateType): FinalStateEvent => {
  return {
    type: AgentExecutionEventType.finalState,
    data: { state },
  };
};

export type InternalEvent = FinalStateEvent;

export const isInternalEvent = (event: AgentBuilderEvent<any, any>): event is InternalEvent => {
  return Object.values(AgentExecutionEventType).includes(event.type);
};
