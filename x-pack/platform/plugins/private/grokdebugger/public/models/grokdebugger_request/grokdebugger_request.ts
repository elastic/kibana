/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPatterns } from '../types';

export interface GrokdebuggerRequestParams {
  rawEvent?: string;
  pattern?: string;
  customPatterns?: CustomPatterns;
}

export class GrokdebuggerRequest {
  rawEvent: string;
  pattern: string;
  customPatterns: CustomPatterns;

  constructor(props: GrokdebuggerRequestParams = {}) {
    this.rawEvent = props.rawEvent ?? '';
    this.pattern = props.pattern ?? '';
    this.customPatterns = props.customPatterns ?? {};
  }

  public get upstreamJSON() {
    return {
      rawEvent: this.rawEvent,
      pattern: this.pattern,
      customPatterns: this.customPatterns,
    };
  }
}
