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
}

export interface Agent {
  id: string;
  name: string;
  color?: string;
  symbol?: string;
}

export interface ActiveSource {
  id: string;
  name: string;
  type: string;
  stackConnectors: string[];
  workflows: string[];
  agentTools: string[];
  usedBy?: Agent[]; // Agents using this source (future)
  createdAt?: string; // Auto-populated by Saved Objects
  updatedAt?: string; // Auto-populated by Saved Objects
}
