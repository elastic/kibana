/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin as PluginClass } from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { EntityClient } from './lib/entity_client';

export interface EntityManagerPublicPluginSetup {
  entityClient: EntityClient;
}
export interface EntityManagerPublicPluginStart {
  entityClient: EntityClient;
}

export interface EntityManagerPublicPluginSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface EntityManagerPublicPluginStartDependencies {
  uiActions: UiActionsStart;
}

export type EntityManagerPluginClass = PluginClass<
  EntityManagerPublicPluginSetup,
  EntityManagerPublicPluginStart,
  EntityManagerPublicPluginSetupDependencies,
  EntityManagerPublicPluginStartDependencies
>;
