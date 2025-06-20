/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ActionResult {
  researchGoal: string;
  toolName: string;
  arguments: any;
  response: any;
}

export interface ReflectionResult {
  isSufficient: boolean;
  nextQuestions: string[];
  reasoning: string;
}

export type BacklogItem = ActionResult | ReflectionResult;

export const isReflectionResult = (item: BacklogItem): item is ReflectionResult => {
  return 'isSufficient' in item;
};

export const isActionResult = (item: BacklogItem): item is ActionResult => {
  return 'toolName' in item;
};

export const lastReflectionResult = (backlog: BacklogItem[]): ReflectionResult => {
  for (let i = backlog.length - 1; i >= 0; i--) {
    const current = backlog[i];
    if (isReflectionResult(current)) {
      return current;
    }
  }
  throw new Error('No reflection result found');
};
