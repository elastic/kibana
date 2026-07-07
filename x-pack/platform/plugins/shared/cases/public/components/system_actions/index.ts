/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';

import { getConnectorType } from './cases/cases';

export const registerSystemActions = (triggersActionsUi: TriggersAndActionsUIPublicPluginSetup) =>
  triggersActionsUi.actionTypeRegistry.register(getConnectorType());
