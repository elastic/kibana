/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallbackTransportDefinition } from '@kbn/agent-builder-server';
import { defaultTransport } from './default_transport';

export class CallbackTransportRegistry {
  private readonly transports = new Map<string, CallbackTransportDefinition>();

  register(transport: CallbackTransportDefinition): void {
    if (transport.id === defaultTransport.id || this.transports.has(transport.id)) {
      throw new Error(`Callback transport [${transport.id}] is already registered`);
    }

    this.transports.set(transport.id, transport);
  }

  /** The first registered transport that handles the URL, else the default one. */
  get(callbackUrl: string): CallbackTransportDefinition {
    for (const transport of this.transports.values()) {
      if (transport.handles(callbackUrl)) {
        return transport;
      }
    }

    return defaultTransport;
  }
}
