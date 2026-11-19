/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock MutationObserver with a no-op to prevent EuiPopover positioning
// warnings in jsdom. EuiPopover uses MutationObserver to reposition itself
// on DOM changes, which triggers setState outside of act() in jsdom.
// This is purely visual behavior with no meaning in a headless test environment.
global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords(): MutationRecord[] {
    return [];
  }
} as unknown as typeof MutationObserver;
