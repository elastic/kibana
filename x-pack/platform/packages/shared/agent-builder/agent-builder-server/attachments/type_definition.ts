/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { MaybePromise } from '@kbn/utility-types';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AttachmentBoundedTool } from './tools';

/**
 * Context provided to entity recognition resolver functions.
 */
export interface EntityRecognitionResolverContext {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  spaceId: string;
}

/**
 * Configuration for automatic entity recognition and attachment creation.
 * When a user message matches a pattern, the system can automatically
 * resolve and attach the corresponding entity.
 */
export interface EntityRecognitionConfig {
  /**
   * Regex patterns to match entity references in user messages.
   * E.g., /workflow\s+["']?([a-zA-Z0-9-]+)["']?/i
   */
  patterns: RegExp[];
  /**
   * Extract the entity ID from a regex match result.
   */
  extractId: (match: RegExpMatchArray) => string;
  /**
   * Resolve the entity by ID and return attachment data, or null if not found.
   */
  resolve: (
    entityId: string,
    context: EntityRecognitionResolverContext
  ) => Promise<unknown | null>;
}

/**
 * Configuration for React component rendering within attachments.
 */
export interface AttachmentComponentDefinition {
  /**
   * Lazy-load the React component. Returns a promise that resolves to the component.
   */
  render: () => Promise<ComponentType<AttachmentComponentProps>>;
  /**
   * How the component should be displayed in the conversation UI.
   * - 'inline': Compact inline display
   * - 'expanded': Full-width expanded display (default)
   * - 'modal': Render in a modal dialog
   */
  displayMode?: 'inline' | 'expanded' | 'modal';
  /**
   * Minimum height for the component container in pixels.
   */
  minHeight?: number;
}

/**
 * Props passed to attachment React components.
 */
export interface AttachmentComponentProps<TContent = unknown> {
  /**
   * The attachment instance being rendered.
   */
  attachment: Attachment<string, TContent>;
  /**
   * Function to invoke a tool from the component.
   * Returns a promise that resolves to the tool result.
   */
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  /**
   * Kibana services available to the component.
   * Note: This is typed loosely here; concrete implementations should
   * provide the specific services needed.
   */
  services: Record<string, unknown>;
  /**
   * Callback to update the attachment data.
   */
  onUpdate?: (data: TContent) => void;
}

/**
 * Server-side definition of an attachment type.
 */
export interface AttachmentTypeDefinition<TType extends string = string, TContent = unknown> {
  /**
   * Unique identifier for the attachment type to register.
   */
  id: TType;
  /**
   * validation function, which will be called when the attachment is added to the conversation.
   */
  validate: (input: unknown) => MaybePromise<AttachmentValidationResult<TContent>>;
  /**
   * format the attachment to presented to the LLM
   */
  format: (
    attachment: Attachment<TType, TContent>,
    context: AttachmentFormatContext
  ) => MaybePromise<AgentFormattedAttachment>;
  /**
   * should return the list of tools from the registry which should be exposed to the agent
   * when attachments of that type are present in the conversation.
   *
   * Should be used to expose generic tools related to the attachment type.
   *
   * E.g. the "esql" attachment type exposes the "execute_esql" tool that way.
   */
  getTools?: () => string[];
  /**
   * can be used to provide a description of the attachment type,
   * which will be exposed to the agent when attachments of that type
   * are present in the conversation.
   */
  getAgentDescription?: () => string;

  /**
   * Skills to reference when this attachment type is present.
   * These skills will be made available to the agent for entity-related operations.
   * Skills are merged with any extensions registered by solution plugins.
   */
  skills?: string[];

  /**
   * LLM guidance content specific to this attachment type.
   * This content is appended to the system prompt when attachments
   * of this type are present in the conversation.
   */
  skillContent?: string;

  /**
   * React component for rendering the attachment in the conversation UI.
   * Enables rich, interactive visualizations of attachment data.
   */
  component?: AttachmentComponentDefinition;

  /**
   * Configuration for automatic entity recognition.
   * When enabled, the system can automatically detect entity references
   * in user messages and create attachments for them.
   */
  entityRecognition?: EntityRecognitionConfig;
}

/**
 * Context passed to the {@link AttachmentTypeDefinition.format} function.
 */
export interface AttachmentFormatContext {
  request: KibanaRequest;
  spaceId: string;
}

/**
 * Return type for attachment's validation handlers.
 * Refer to {@link InlineAttachmentTypeDefinition.validate}
 */
export type AttachmentValidationResult<TValidatedData = unknown> =
  /** valid attachment */
  | { valid: true; data: TValidatedData }
  /** validation failed */
  | { valid: false; error: string };

/**
 * Text representation of an attachment when exposed to the LLM.
 */
export interface TextAttachmentRepresentation {
  type: 'text';
  /**
   * Plain text representation of the attachment.
   * Can either be text, markdown, json, xml...
   */
  value: string;
}

/**
 * Representation of an attachment when exposed to the LLM.
 *
 * Only plain text (inlined into the message) is supported for now.
 */
export type AttachmentRepresentation = TextAttachmentRepresentation;

/**
 * Structure containing all methods which will be used to present the attachment to the agent.
 */
export interface AgentFormattedAttachment {
  /**
   * Should return the representation of the attachment, which will be presented to the agent.
   */
  getRepresentation: () => MaybePromise<AttachmentRepresentation>;
  /**
   * Can be used to expose tools which are specific to the attachment instance.
   *
   * **Important**: when multiple attachments of the same type are present in the conversation,
   * this function will be called for each of them, and all the tools will be exposed to the agent.
   * This is why:
   * - the tools should be "scoped" to the attachment instance (no id parameter for references, for example)
   * - the tool ids should be unique (so generated based on the attachment instance or attachment id)
   * - the descriptions should be explicit that they are specific to the attachment instance (specifying the attachment id for example)
   */
  getBoundedTools?: () => MaybePromise<AttachmentBoundedTool[]>;
}
