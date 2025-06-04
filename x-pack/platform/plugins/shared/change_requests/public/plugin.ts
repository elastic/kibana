/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin } from '@kbn/core/public';

export type ChangeRequestsPluginSetup = ReturnType<ChangeRequestsPlugin['setup']>;
export type ChangeRequestsPluginStart = ReturnType<ChangeRequestsPlugin['start']>;

export class ChangeRequestsPlugin
  implements Plugin<ChangeRequestsPluginSetup, ChangeRequestsPluginStart>
{
  public setup() {
    // TODO: Create UI widget and expose it here
    // I guess the widget should show two sections, one for your own requests and another one for things you could approve (if you have the right privilege)
    // How can I make sure that the request the UI makes to submit this request still matches the API type of the target
    // endpoint if I'm using the route repository?
  }

  public start() {
    // I guess I should expose an API client here based on the repository?
    // In case another plugin wants to submit a CR
  }
}
