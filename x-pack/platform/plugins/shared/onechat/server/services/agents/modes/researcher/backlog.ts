/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SearchResult {
  researchGoal: string;
  output: string;
}

export interface ReflectionResult {
  isSufficient: boolean;
  nextQuestions: string[];
  reasoning: string;
}

export interface ResearchGoalResult {
  researchGoal: string;
  reasoning: string;
}

export type BacklogItem = SearchResult | ReflectionResult | ResearchGoalResult;

export const isResearchGoalResult = (item: BacklogItem): item is ResearchGoalResult => {
  return 'researchGoal' in item && 'reasoning' in item;
};

export const isReflectionResult = (item: BacklogItem): item is ReflectionResult => {
  return 'isSufficient' in item;
};

export const isSearchResult = (item: BacklogItem): item is SearchResult => {
  return 'researchGoal' in item && 'output' in item;
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

export const firstResearchGoalResult = (backlog: BacklogItem[]): ResearchGoalResult => {
  for (let i = 0; i < backlog.length; i++) {
    const current = backlog[i];
    if (isResearchGoalResult(current)) {
      return current;
    }
  }
  throw new Error('No research goal result found');
};
