/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProviderId, PlainIdToolIdentifier } from './tools';

export enum ToolSelectionType {
  byIds = 'by_ids',
  byProvider = 'by_provider',
}

/**
 * Represents a tool selection based on individual IDs.
 */
export interface ByIdsToolSelection {
  type: ToolSelectionType.byIds;
  /**
   * The id of the provider to select tools from
   */
  providerId: ToolProviderId;
  /**
   * List of individual tool ids to select from the provider
   */
  toolIds: PlainIdToolIdentifier[];
}

/**
 * A provider-based tool selection.
 * Selects **all** tools from the specified provider
 */
export interface ByProviderSelection {
  type: ToolSelectionType.byProvider;
  /**
   * The provider to select all tools from.
   */
  providerId: ToolProviderId;
}

/**
 * All possible choices for tool selection
 */
export type ToolSelection = ByIdsToolSelection | ByProviderSelection;

export const isByIdsToolSelection = (
  toolSelection: ToolSelection
): toolSelection is ByIdsToolSelection => {
  return toolSelection.type === ToolSelectionType.byIds;
};

export const isByProviderToolSelection = (
  toolSelection: ToolSelection
): toolSelection is ByProviderSelection => {
  return toolSelection.type === ToolSelectionType.byProvider;
};
