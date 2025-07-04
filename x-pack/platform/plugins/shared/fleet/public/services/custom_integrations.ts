/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CustomIntegrationsSetup,
  CustomIntegrationsStart,
} from '@kbn/custom-integrations-plugin/public';

let customIntegrations: CustomIntegrationsSetup;
let customIntegrationsStart: CustomIntegrationsStart;

export function setCustomIntegrations(value: CustomIntegrationsSetup): void {
  customIntegrations = value;
}

export function getCustomIntegrations(): CustomIntegrationsSetup {
  return customIntegrations;
}

export function setCustomIntegrationsStart(value: CustomIntegrationsStart): void {
  customIntegrationsStart = value;
}

export function getCustomIntegrationsStart(): CustomIntegrationsStart {
  return customIntegrationsStart;
}
