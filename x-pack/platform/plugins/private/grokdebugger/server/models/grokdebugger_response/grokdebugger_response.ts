/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { IngestSimulateResponse } from '@elastic/elasticsearch/lib/api/types';

/**
 * This model captures the grok debugger response from upstream to be passed to
 * the view
 */
interface GrokdebuggerResponseProps {
  structuredEvent?: Record<string, unknown>;
  /**
   * `error` is either a translated error message string, or an empty object (no error).
   */
  error?: string | Record<string, never>;
}

export class GrokdebuggerResponse {
  structuredEvent: Record<string, unknown>;
  error: string | Record<string, never>;

  constructor(props: GrokdebuggerResponseProps) {
    this.structuredEvent = props.structuredEvent ?? {};
    this.error = props.error ?? {};
  }

  // generate GrokdebuggerResponse object from elasticsearch response
  static fromUpstreamJSON(upstreamGrokdebuggerResponse: IngestSimulateResponse) {
    const { docs } = upstreamGrokdebuggerResponse;
    const error = docs[0].error;
    if (!isEmpty(error)) {
      const opts = {
        error: i18n.translate('xpack.grokDebugger.patternsErrorMessage', {
          defaultMessage: 'Provided {grokLogParsingTool} patterns do not match data in the input',
          values: {
            grokLogParsingTool: 'Grok',
          },
        }),
      };
      return new GrokdebuggerResponse(opts);
    }
    // `IngestDocumentSimulation._source` is typed as `Record<string, any>` upstream.
    // Normalize to `Record<string, unknown>` to avoid leaking `any` into this plugin.
    const source: Record<string, unknown> = docs[0].doc?._source ?? {};
    const structuredEvent = omit(source, 'rawEvent');
    const opts = { structuredEvent };
    return new GrokdebuggerResponse(opts);
  }
}
