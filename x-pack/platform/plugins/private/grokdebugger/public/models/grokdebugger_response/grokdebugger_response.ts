/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokdebuggerResponseParams } from '../types';

export class GrokdebuggerResponse {
  /** See {@link GrokdebuggerResponseParams.structuredEvent} */
  structuredEvent: Record<string, unknown>;
  /** See {@link GrokdebuggerResponseParams.error} */
  error: string | Record<string, never>;

  constructor(props: GrokdebuggerResponseParams) {
    this.structuredEvent = props.structuredEvent ?? {};
    this.error = props.error ?? {};
  }

  static fromUpstreamJSON(grokdebuggerResponse: GrokdebuggerResponseParams) {
    return new GrokdebuggerResponse(grokdebuggerResponse);
  }
}
