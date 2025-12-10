/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AgentInterruptType {
  confirm = 'confirm',
}

export interface ConfirmInterruptData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface InterruptDataMap {
  [AgentInterruptType.confirm]: ConfirmInterruptData;
}

export type InterruptDataOfType<T extends AgentInterruptType> = InterruptDataMap[T];

export interface InterruptRequestMixin<IType extends AgentInterruptType = AgentInterruptType> {
  type: IType;
  data: InterruptDataOfType<IType>;
  state: Record<string, unknown>;
}

export type ConfirmInterruptRequest = InterruptRequestMixin<AgentInterruptType.confirm>;

// only one subtype for now
export type InterruptRequest = ConfirmInterruptRequest;

export const isConfirmInterruptRequest = (
  request: InterruptRequest
): request is ConfirmInterruptRequest => {
  return request.type === AgentInterruptType.confirm;
};

export interface ToolInterruption {
  type: 'tool';
  toolId: string;
  toolCallId: string;
}
