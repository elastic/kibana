/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DECISION_NODE_TYPES,
  DECISION_TREE_TURN_KINDS,
  LEARNING_KINDS,
  SYSTEM_LEARNING_CATEGORIES,
  TOOL_LEARNING_CATEGORIES,
} from './src/types';
export type {
  DecisionEdgeView,
  DecisionNodeType,
  DecisionNodeView,
  DecisionTreeTurnKind,
  DecisionTreeUpdateSubmission,
  DecisionTreeView,
  LearningKind,
  LearningRecord,
  SystemLearningCategory,
  ToolLearningCategory,
} from './src/types';

export { applyEvidenceMetadata, extractMermaid, parseMermaidDecisionTree } from './src/mermaid';

export {
  DecisionTreeValidationError,
  MAX_DROPPED_NODE_RATIO,
  MIN_RETAINED_SIZE_RATIO,
  enforceNodePreservation,
  enforceParsedSizeFloor,
  enforceRawSizeFloor,
  validateEvidenceMetadata,
  validateShortText,
} from './src/guardrails';

export {
  DECISION_TREE_DIRECTORY,
  SYMPTOM_TREE_ID_PREFIX,
  isSymptomTreeId,
  normalizeSymptomSlug,
  symptomFilePath,
  symptomSlugError,
  symptomSlugFromTreeId,
  symptomTreeId,
} from './src/symptom';

export {
  DECISION_TREE_ABSTRACTION_RULES,
  DECISION_TREE_FORMAT_GUIDE,
  DECISION_TREE_MERGE_DISCIPLINE,
  DECISION_TREE_REINFORCEMENT_SYSTEM_PROMPT,
  SCRIPT_FOLLOWUP_EXTEND,
  SCRIPT_INITIAL_CREATE,
  SCRIPT_INITIAL_MERGE,
  SCRIPT_REINFORCE,
  buildDecisionTreePlanSystemPrompt,
  buildTurnPrompt,
  selectTurnScript,
} from './src/prompts';

export { decisionTreePlanSchema } from './src/plan';
export type { DecisionTreePlan } from './src/plan';
