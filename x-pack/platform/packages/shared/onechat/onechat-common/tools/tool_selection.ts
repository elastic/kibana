/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProviderId, PlainIdToolIdentifier } from './tools';

export enum ToolSelectionType {
  byId = 'by_id',
  byProvider = 'by_provider',
}

export interface ByIdToolSelection {
  type: ToolSelectionType.byId;
  /**
   * The id of the
   */
  providerId: ToolProviderId;
  toolIds: PlainIdToolIdentifier[];
}

export interface ByProviderSelection {
  type: ToolSelectionType.byProvider;
  providerId: ToolProviderId;
}

export type ToolSelection = ByIdToolSelection | ByProviderSelection;

export const isByIdToolSelection = (
  toolSelection: ToolSelection
): toolSelection is ByIdToolSelection => {
  return toolSelection.type === ToolSelectionType.byId;
};

export const isByProviderToolSelection = (
  toolSelection: ToolSelection
): toolSelection is ByProviderSelection => {
  return toolSelection.type === ToolSelectionType.byProvider;
};
