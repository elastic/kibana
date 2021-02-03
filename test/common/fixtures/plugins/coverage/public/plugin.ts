/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin } from 'kibana/server';

declare global {
  interface Window {
    __coverage__: any;
    flushCoverageToLog: any;
  }
}

export class CodeCoverageReportingPlugin implements Plugin {
  constructor() {}

  public start() {}

  public setup() {
    window.flushCoverageToLog = function () {
      if (window.__coverage__) {
        // eslint-disable-next-line no-console
        console.log('coveragejson:' + btoa(JSON.stringify(window.__coverage__)));
      }
    };
    window.addEventListener('beforeunload', window.flushCoverageToLog);
  }
}
