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
  icon: string;
  category: ConnectorCategory;
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
  connectedAs: string; // Account/user the connector is connected as
  createdAt: string; // ISO date string
  usedBy: Agent[]; // Agents using this source
}
