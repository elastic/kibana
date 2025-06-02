/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin } from '@kbn/core/public';

export type ChangeRequestsPluginSetup = ReturnType<ChangeRequestsPlugin['setup']>;
export type ChangeRequestsPluginStart = ReturnType<ChangeRequestsPlugin['start']>;

// Create UI widget and expose it here
// I guess the widget should show two sections, one for your own requests and another one for things you could approve (if you have the right privilege)
export class ChangeRequestsPlugin
  implements Plugin<ChangeRequestsPluginSetup, ChangeRequestsPluginStart>
{
  public setup() {}

  public start() {}
}
