/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DataSourceCategory = 'popular' | 'all';

export interface Connector {
  id: string;
  name: string;
  type: string;
  category: DataSourceCategory;
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
  usedBy?: Agent[];
  createdAt?: string;
  updatedAt?: string;
}
