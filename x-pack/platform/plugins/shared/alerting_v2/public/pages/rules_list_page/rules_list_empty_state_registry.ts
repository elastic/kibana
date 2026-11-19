/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';

let registeredRulesListEmptyState: ComponentType | undefined;

/** Host override for the Universal rules-list empty state (e.g. MixedCreate chooser). */
export const registerRulesListEmptyState = (component: ComponentType): void => {
  registeredRulesListEmptyState = component;
};

export const getRegisteredRulesListEmptyState = (): ComponentType | undefined =>
  registeredRulesListEmptyState;
