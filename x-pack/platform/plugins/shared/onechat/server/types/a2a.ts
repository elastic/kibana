/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A2A Protocol types based on the official Agent2Agent specification
 * See: https://github.com/a2aproject/a2a-js
 */

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  provider: AgentProvider;
  version: string;
  capabilities: AgentCapabilities;
  securitySchemes?: SecuritySchemes;
  security?: SecurityRequirement[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: Skill[];
  supportsAuthenticatedExtendedCard: boolean;
}

export interface AgentProvider {
  organization: string;
  url: string;
}

export interface AgentCapabilities {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory: boolean;
}

export interface SecuritySchemes {
  [name: string]: SecurityScheme;
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: { [scope: string]: string };
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputModes: string[];
  outputModes: string[];
}

// A2A Task and Message types
export interface A2ATask {
  kind: 'task';
  id: string;
  contextId: string;
  status: TaskStatus;
  history: A2AMessage[];
  metadata?: { [key: string]: any };
  artifacts: A2AArtifact[];
}

export interface TaskStatus {
  state: TaskState;
  message?: A2AMessage;
  timestamp: string;
}

export type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'auth-required'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface A2AMessage {
  kind: 'message';
  role: 'user' | 'agent';
  messageId: string;
  parts: A2APart[];
  taskId: string;
  contextId: string;
  metadata?: { [key: string]: any };
}

export interface A2AArtifact {
  artifactId: string;
  name: string;
  parts: A2APart[];
}

export type A2APart = TextPart | FilePart | DataPart;

export interface TextPart {
  kind: 'text';
  text: string;
}

export interface FilePart {
  kind: 'file';
  name: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface DataPart {
  kind: 'data';
  data: any; // JSON data
}

// A2A RPC Request/Response types
export interface TaskSendRequest {
  id: string;
  message: A2AMessage;
  contextId?: string;
}

export interface TaskStatusUpdateEvent {
  kind: 'status-update';
  taskId: string;
  contextId: string;
  status: TaskStatus;
  final: boolean;
}

export interface TaskArtifactUpdateEvent {
  kind: 'artifact-update';
  taskId: string;
  contextId: string;
  artifact: A2AArtifact;
  append: boolean;
  lastChunk: boolean;
}

export type A2AEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent;
