/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class MyPlugin {
  public start(core, plugins) {
    plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, 'case_action', async () => {
      // GOOD. LET THE REGISTRY DECIDE WHEN TO LOAD THE DEFINITION
      return import('./case_action'); // GOOD. ACTION IMPLEMENTATION ONLY LOADED WHEN NEEDED.
    });
  }
}
