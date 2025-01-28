/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type ChatActionClickPayloadBase<TType extends ChatActionClickType, TExtraProps extends {}> = {
  type: TType;
} & TExtraProps;

type ChatActionClickPayloadExecuteEsql = ChatActionClickPayloadBase<
  | ChatActionClickType.executeEsqlQuery
  | ChatActionClickType.visualizeEsqlQuery
  | ChatActionClickType.updateVisualization,
  { query: string; userOverrides?: unknown }
>;

export type ChatActionClickPayload = ChatActionClickPayloadExecuteEsql;

export enum ChatActionClickType {
  executeEsqlQuery = 'executeEsqlQuery',
  visualizeEsqlQuery = 'visualizeEsqlQuery',
  updateVisualization = 'updateVisualization',
}

export type ChatActionClickHandler = (payload: ChatActionClickPayload) => void;

export interface ChatFlyoutSecondSlotHandler {
  container?: HTMLDivElement | null;
  setVisibility?: (status: boolean) => void;
}
