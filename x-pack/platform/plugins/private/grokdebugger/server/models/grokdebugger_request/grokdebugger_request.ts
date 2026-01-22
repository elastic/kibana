/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestSimulateRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * Model to capture Grokdebugger request with upstream (ES) helpers.
 */
export interface DownstreamGrokdebuggerRequest {
  rawEvent: string;
  pattern: string;
  // Runtime boundary: user-provided values from the HTTP layer
  customPatterns?: Record<string, unknown>;
}

interface GrokdebuggerRequestProps {
  rawEvent?: string;
  pattern?: string;
  customPatterns?: Record<string, string>;
}

export class GrokdebuggerRequest {
  rawEvent: string;
  pattern: string;
  customPatterns: Record<string, string>;

  constructor(props: GrokdebuggerRequestProps) {
    this.rawEvent = props.rawEvent ?? '';
    this.pattern = props.pattern ?? '';
    this.customPatterns = props.customPatterns ?? {};
  }

  public get upstreamJSON() {
    return {
      pipeline: {
        description: 'this is a grokdebugger simulation',
        processors: [
          {
            grok: {
              field: 'rawEvent',
              pattern_definitions: this.customPatterns,
              patterns: [this.pattern.toString()],
            },
          },
        ],
      },
      docs: [
        {
          _index: 'grokdebugger',
          _id: 'grokdebugger',
          _source: {
            rawEvent: this.rawEvent.toString(),
          },
        },
      ],
    } as IngestSimulateRequest;
  }

  // generate GrokdebuggerRequest object from kibana
  static fromDownstreamJSON(downstreamGrokdebuggerRequest: DownstreamGrokdebuggerRequest) {
    // Elasticsearch Grok processor expects pattern_definitions as Record<string, string>.
    // Filter runtime input (Record<string, unknown>) to ensure only string values are passed.
    // Example: { POSTFIX_QUEUEID: '[0-9A-F]{10,11}' }
    const customPatterns: Record<string, string> = {};
    const rawCustomPatterns = downstreamGrokdebuggerRequest.customPatterns;
    if (
      rawCustomPatterns &&
      typeof rawCustomPatterns === 'object' &&
      !Array.isArray(rawCustomPatterns)
    ) {
      for (const [key, value] of Object.entries(rawCustomPatterns)) {
        if (typeof value === 'string') {
          customPatterns[key] = value;
        }
      }
    }
    const opts = {
      rawEvent: downstreamGrokdebuggerRequest.rawEvent,
      pattern: downstreamGrokdebuggerRequest.pattern,
      customPatterns,
    };

    return new GrokdebuggerRequest(opts);
  }
}
