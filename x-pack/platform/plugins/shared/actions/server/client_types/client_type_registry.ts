/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { AuthMode } from '@kbn/connector-specs';
import type { ConnectorTokenClientContract } from '../types';

export interface RegisteredClientType<TClient = unknown, TConfig = Record<string, unknown>> {
  id: string;
  /** Auth type IDs this client supports, or `'*'` for all. */
  supportedAuthTypes: string[] | '*';
  create: (opts: CreateClientOpts & { clientConfig: TConfig }) => Promise<TClient>;
  connect?: (client: TClient) => Promise<void>;
  disconnect?: (client: TClient) => Promise<void>;
  isConnected?: (client: TClient) => boolean;
}

export interface CreateClientOpts {
  connectorId: string;
  secrets: Record<string, unknown>;
  config: Record<string, unknown>;
  additionalHeaders?: Record<string, string>;
  connectorTokenClient?: ConnectorTokenClientContract;
  signal?: AbortSignal;
  authMode?: AuthMode;
  profileUid?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRegisteredClientType = RegisteredClientType<any, any>;

export class ClientTypeRegistry {
  private readonly clientTypes: Map<string, AnyRegisteredClientType> = new Map();

  public has(id: string): boolean {
    return this.clientTypes.has(id);
  }

  public register(clientType: AnyRegisteredClientType): void {
    if (this.has(clientType.id)) {
      throw new Error(
        i18n.translate('xpack.actions.clientTypeRegistry.register.duplicateClientTypeError', {
          defaultMessage: 'Client type "{id}" is already registered.',
          values: { id: clientType.id },
        })
      );
    }
    this.clientTypes.set(clientType.id, clientType);
  }

  public get(id: string): AnyRegisteredClientType {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.clientTypeRegistry.get.missingClientTypeError', {
          defaultMessage: 'Client type "{id}" is not registered.',
          values: { id },
        })
      );
    }
    return this.clientTypes.get(id)!;
  }

  public getAllTypes(): string[] {
    return Array.from(this.clientTypes.keys());
  }
}
