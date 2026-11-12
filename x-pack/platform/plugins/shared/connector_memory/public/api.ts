/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';
import type { HttpSetup } from '@kbn/core-http-browser';
import { API_BASE_PATH } from '../common/constants';
import type { ConnectorListEntry, ConnectorSettingsBody, ConnectorStatus } from '../common/types';

/** Chat-capable connector types the inference plugin can call, which is what summaries need. */
const MODEL_CONNECTOR_TYPES = ['.inference', '.gen-ai', '.bedrock', '.gemini'];

/** The calls the browser makes to the plugin's server routes, in one place. */
export class ConnectorMemoryApi {
  constructor(private readonly http: HttpSetup) {}

  async listConnectors(): Promise<ConnectorListEntry[]> {
    const { connectors } = await this.http.get<{ connectors: ConnectorListEntry[] }>(
      `${API_BASE_PATH}/connectors`
    );
    return connectors;
  }

  getStatus(connectorId: string): Promise<ConnectorStatus> {
    return this.http.get<ConnectorStatus>(
      `${API_BASE_PATH}/status/${encodeURIComponent(connectorId)}`
    );
  }

  /** Saves what an admin chose for the connector, replacing any earlier choices. */
  saveSettings(connectorId: string, settings: ConnectorSettingsBody): Promise<unknown> {
    return this.http.put(`${API_BASE_PATH}/settings/${encodeURIComponent(connectorId)}`, {
      body: JSON.stringify(settings),
    });
  }

  /** Puts the connector back to the defaults (and removes its crawl). */
  resetSettings(connectorId: string): Promise<unknown> {
    return this.http.delete(`${API_BASE_PATH}/settings/${encodeURIComponent(connectorId)}`);
  }

  runCrawl(connectorId: string): Promise<unknown> {
    return this.http.post(`${API_BASE_PATH}/crawl/${encodeURIComponent(connectorId)}/_run`);
  }

  async listModels(): Promise<Array<{ id: string; name: string }>> {
    const connectors = await this.http.get<
      Array<{ id: string; name: string; connector_type_id: string }>
    >(`${BASE_ACTION_API_PATH}/connectors`);
    return connectors
      .filter(({ connector_type_id: type }) => MODEL_CONNECTOR_TYPES.includes(type))
      .map(({ id, name }) => ({ id, name }));
  }
}

/** The server's own message for a failed call, when it sent one. */
export const messageOf = (error: unknown): string => {
  const body = (error as { body?: { message?: unknown } } | undefined)?.body;
  return typeof body?.message === 'string'
    ? body.message
    : String((error as Error)?.message ?? error);
};
