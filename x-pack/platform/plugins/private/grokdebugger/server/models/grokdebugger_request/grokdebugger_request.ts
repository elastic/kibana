/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPatterns } from '../../../common/types';

/**
 * Model to capture Grokdebugger request with upstream (ES) helpers.
 */
export interface DownstreamGrokdebuggerRequest {
  rawEvent: string;
  pattern: string;
  customPatterns?: CustomPatterns;
}

interface GrokdebuggerRequestProps {
  rawEvent?: string;
  pattern?: string;
  customPatterns?: CustomPatterns;
}

export class GrokdebuggerRequest {
  rawEvent: string;
  pattern: string;
  customPatterns: CustomPatterns;

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
    };
  }

  static fromDownstreamJSON(downstreamGrokdebuggerRequest: DownstreamGrokdebuggerRequest) {
    return new GrokdebuggerRequest({
      rawEvent: downstreamGrokdebuggerRequest.rawEvent,
      pattern: downstreamGrokdebuggerRequest.pattern,
      customPatterns: downstreamGrokdebuggerRequest.customPatterns,
    });
  }
}
