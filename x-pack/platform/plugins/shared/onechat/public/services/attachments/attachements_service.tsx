/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment, AttachmentType } from '@kbn/onechat-common/attachments';
import type {
  AttachmentUIDefinition,
  AttachmentContentProps,
  AttachmentEditorProps,
} from '@kbn/onechat-browser';
import type { ReactNode } from 'react';
import {
  TextContentRenderer,
  TextEditorRenderer,
  EsqlContentRenderer,
  EsqlEditorRenderer,
  ScreenContextContentRenderer,
  VisualizationContentRenderer,
  DefaultJsonRenderer,
} from './default_renderers';

/**
 * Type for render content function.
 */
export type RenderContentFn = (props: AttachmentContentProps) => ReactNode;

/**
 * Type for render editor function.
 */
export type RenderEditorFn = (props: AttachmentEditorProps) => ReactNode;

/**
 * Internal service for managing attachment UI definitions.
 * This service maintains a registry of UI definitions for different attachment types.
 */
export class AttachmentsService {
  private readonly registry: Map<string, AttachmentUIDefinition> = new Map();

  /**
   * Default renderers for built-in attachment types.
   */
  private readonly defaultRenderers: Record<string, {
    renderContent: RenderContentFn;
    renderEditor?: RenderEditorFn;
    isEditable: boolean;
  }> = {
    text: {
      renderContent: TextContentRenderer,
      renderEditor: TextEditorRenderer,
      isEditable: true,
    },
    esql: {
      renderContent: EsqlContentRenderer,
      renderEditor: EsqlEditorRenderer,
      isEditable: true,
    },
    screen_context: {
      renderContent: ScreenContextContentRenderer,
      isEditable: false,
    },
    visualization: {
      renderContent: VisualizationContentRenderer,
      isEditable: false,
    },
  };

  /**
   * Registers a UI definition for a specific attachment type.
   *
   * @param attachmentType - The unique identifier for the attachment type
   * @param definition - The UI definition for rendering this attachment type
   * @throws Error if the attachment type is already registered
   */
  addAttachmentType<TAttachment extends UnknownAttachment = UnknownAttachment>(
    attachmentType: string,
    definition: AttachmentUIDefinition<TAttachment>
  ): void {
    if (this.registry.has(attachmentType)) {
      throw new Error(`Attachment type "${attachmentType}" is already registered.`);
    }
    this.registry.set(attachmentType, definition as AttachmentUIDefinition);
  }

  /**
   * Retrieves the UI definition for a specific attachment type.
   *
   * @param attachmentType - The type identifier to look up
   * @returns The UI definition if registered, undefined otherwise
   */
  getAttachmentUiDefinition<TAttachment extends UnknownAttachment = UnknownAttachment>(
    attachmentType: string
  ): AttachmentUIDefinition<TAttachment> | undefined {
    return this.registry.get(attachmentType) as AttachmentUIDefinition<TAttachment> | undefined;
  }

  /**
   * Checks if a UI definition is registered for the given attachment type.
   *
   * @param attachmentType - The type identifier to check
   * @returns true if a definition is registered, false otherwise
   */
  hasAttachmentType(attachmentType: string): boolean {
    return this.registry.has(attachmentType);
  }

  /**
   * Gets the content render function for a specific attachment type.
   * Returns the registered renderer if available, otherwise falls back to
   * default renderers for built-in types, then to JSON fallback.
   *
   * @param attachmentType - The type identifier to look up
   * @returns The render function for viewing attachment content
   */
  getRenderContent(attachmentType: string): RenderContentFn {
    // First check registered UI definition
    const definition = this.registry.get(attachmentType);
    if (definition?.renderContent) {
      return definition.renderContent as RenderContentFn;
    }

    // Fall back to default renderers for built-in types
    const defaultRenderer = this.defaultRenderers[attachmentType];
    if (defaultRenderer?.renderContent) {
      return defaultRenderer.renderContent;
    }

    // Ultimate fallback: JSON renderer
    return DefaultJsonRenderer;
  }

  /**
   * Gets the editor render function for a specific attachment type.
   * Returns undefined if the type doesn't support editing.
   *
   * @param attachmentType - The type identifier to look up
   * @returns The render function for editing attachment content, or undefined
   */
  getRenderEditor(attachmentType: string): RenderEditorFn | undefined {
    // First check registered UI definition
    const definition = this.registry.get(attachmentType);
    if (definition?.renderEditor) {
      return definition.renderEditor as RenderEditorFn;
    }

    // Fall back to default renderers for built-in types
    const defaultRenderer = this.defaultRenderers[attachmentType];
    return defaultRenderer?.renderEditor;
  }

  /**
   * Checks if a specific attachment type supports editing.
   *
   * @param attachmentType - The type identifier to check
   * @returns true if the type supports editing, false otherwise
   */
  isEditable(attachmentType: string): boolean {
    // First check registered UI definition
    const definition = this.registry.get(attachmentType);
    if (definition) {
      // If isEditable is explicitly set, use it; otherwise check if editor exists
      return definition.isEditable ?? Boolean(definition.renderEditor);
    }

    // Fall back to default renderers for built-in types
    const defaultRenderer = this.defaultRenderers[attachmentType];
    return defaultRenderer?.isEditable ?? false;
  }
}
