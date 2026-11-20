/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getActionTypeIdFromStepType(stepType: string): string {
  const cleanStepType = stepType.startsWith('.') ? stepType.slice(1) : stepType;
  const [actionType] = cleanStepType.split('.');
  return `.${actionType}`;
}

export function getActionTypeDisplayNameFromStepType(stepType: string): string {
  const actionType = getActionTypeIdFromStepType(stepType).slice(1); // Remove the leading dot
  return actionType.charAt(0).toUpperCase() + actionType.slice(1);
}
