/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transitions } from '../transitions';
import { transitionsRegistry } from './transitions_registry';

export function loadTransitions() {
  transitions.forEach((spec) => transitionsRegistry.register(spec));
}
