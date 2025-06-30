/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PlanningResult {
  reasoning: string;
  steps: string[];
}

export interface StepExecutionResult {
  step: string;
  output: string;
}

export type BacklogItem = PlanningResult | StepExecutionResult;

export const isPlanningResult = (item: BacklogItem): item is PlanningResult => {
  return 'steps' in item && 'reasoning' in item;
};

export const isStepExecutionResult = (item: BacklogItem): item is StepExecutionResult => {
  return 'step' in item && 'output' in item;
};

export const lastPlanningResult = (backlog: BacklogItem[]): PlanningResult => {
  for (let i = backlog.length - 1; i >= 0; i--) {
    const current = backlog[i];
    if (isPlanningResult(current)) {
      return current;
    }
  }
  throw new Error('No reflection result found');
};

export const lastStepExecutionResult = (backlog: BacklogItem[]): StepExecutionResult => {
  for (let i = backlog.length - 1; i >= 0; i--) {
    const current = backlog[i];
    if (isStepExecutionResult(current)) {
      return current;
    }
  }
  throw new Error('No reflection result found');
};
