/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CelInputStateDetails } from './types';

/**
 * Gets a list of variables that require redaction from agent logs for the CEL input.
 */
export function getRedactVariables(stateDetails: CelInputStateDetails[]): string[] {
  const redact = [] as string[];
  for (const cVar of stateDetails) {
    if (cVar.redact) {
      redact.push(cVar.name);
    }
  }
  return redact;
}

/**
 * Gets an object containing state variables and their corresponding default values.
 */
export function getStateVarsAndDefaultValues(stateDetails: CelInputStateDetails[]): object {
  const defaultStateVarSettings: Record<string, unknown> = {};
  for (const stateVar of stateDetails) {
    defaultStateVarSettings[stateVar.name] = stateVar.default;
  }
  return defaultStateVarSettings;
}

/**
 * Gets an object containing state variables configuration information.
 */
export function getStateVarsConfigDetails(stateDetails: CelInputStateDetails[]): object {
  const defaultStateVarConfigSettings: Record<string, unknown> = {};
  for (const stateVar of stateDetails) {
    if (stateVar.configurable) {
      defaultStateVarConfigSettings[stateVar.name] = {
        description: stateVar.description,
        type: stateVar.type,
        default: stateVar.default,
      };
    }
  }
  return defaultStateVarConfigSettings;
}
