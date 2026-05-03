/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AgentType,
  agentBuilderDefaultAgentId,
  type AgentDefinition,
  type AgentConfiguration,
  type AgentConfigurationOverrides,
  type RuntimeAgentConfigurationOverrides,
  type AgentResearchStepConfiguration,
  type AgentAnswerStepConfiguration,
} from './definition';
export { VISIBILITY_ICON, VISIBILITY_BADGE_COLOR, AgentVisibility } from './visibility';
export {
  canCurrentUserEditAgent,
  isAgentOwner,
  canChangeAgentVisibility,
  hasAgentReadAccess,
  hasAgentWriteAccess,
} from './access_control';
export { agentIdRegexp, agentIdMaxLength, validateAgentId } from './agent_ids';
export {
  type AgentCapabilities,
  type ResolvedAgentCapabilities,
  getKibanaDefaultAgentCapabilities,
} from './capabilities';
export { AgentExecutionErrorCode } from './execution_errors';
export { AgentExecutionMode, SubagentExecutionMode } from './execution_mode';
export { ExecutionStatus, type SerializedExecutionError } from './execution_status';
export {
  type ConfirmPromptColor,
  type ConfirmPromptDefinition,
  type ConfirmationPrompt,
  type ConfirmationPromptResponse,
  type PromptResponse,
  type PromptRequest,
  type ToolCallPromptRequestSource,
  type PromptRequestSource,
  type ConfirmationPromptResponseState,
  type PromptResponseState,
  ConfirmationStatus,
  AgentPromptType,
  AgentPromptRequestSourceType,
  isConfirmationPrompt,
  type PromptStorageState,
} from './prompts';
