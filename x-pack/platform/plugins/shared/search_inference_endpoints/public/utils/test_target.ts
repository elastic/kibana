/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TestTarget =
  | { inferenceId: string }
  | { featureId: string; featureName: string }
  | { connectorId: string; connectorName: string };

export type TestTargetVariables =
  | { inferenceId: string }
  | { featureId: string }
  | { connectorId: string };

export const getTestTargetVariables = (target: TestTarget): TestTargetVariables => {
  if ('featureId' in target) {
    return { featureId: target.featureId };
  }
  if ('connectorId' in target) {
    return { connectorId: target.connectorId };
  }
  return { inferenceId: target.inferenceId };
};

export const getTestTargetName = (target: TestTarget) => {
  if ('featureId' in target) {
    return target.featureName;
  }
  if ('connectorId' in target) {
    return target.connectorName;
  }
  return target.inferenceId;
};
