/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ConnectorCategory = 'popular' | 'all';

export interface Connector {
  id: string;
  name: string;
  type: string;
  category: ConnectorCategory;
  connectorSpecId?: string; // lazy-loaded icons from connector-specs
  icon?: string; // For dummy connectors - will be cleaned up
}

export interface Agent {
  id: string;
  name: string;
  color?: string; // Avatar color
  symbol?: string; // Avatar symbol/icon
}

export interface ActiveSource {
  id: string;
  name: string;
  type: string;
  stackConnectors: string[];
  workflowIds: string[];
  toolIds: string[];
  usedBy?: Agent[]; // Agents using this source (future)
}
