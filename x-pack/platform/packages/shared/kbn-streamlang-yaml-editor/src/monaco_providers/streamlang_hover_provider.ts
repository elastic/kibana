/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import { StreamlangActionHandler } from './streamlang_action_handler';
import type { ActionHoverContext } from './provider_interfaces';

/**
 * Monaco hover provider for Streamlang actions
 * Provides rich documentation when hovering over action properties
 */
export class StreamlangHoverProvider implements monaco.languages.HoverProvider {
  private readonly actionHandler: StreamlangActionHandler;

  constructor() {
    this.actionHandler = new StreamlangActionHandler();
  }

  async provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Hover | null> {
    try {
      const content = model.getValue();
      const yamlDocument = YAML.parseDocument(content);

      // Get the text around the cursor to find the action type
      const context = this.buildHoverContext(model, position, yamlDocument);

      if (!context || !context.actionType) {
        return null;
      }

      // Check if handler can handle this action type
      if (!this.actionHandler.canHandle(context.actionType)) {
        return null;
      }

      // Generate hover content
      const hoverContent = await this.actionHandler.generateHoverContent(context);
      if (!hoverContent) {
        return null;
      }

      // Calculate range for hover
      const word = model.getWordAtPosition(position);
      const range = word
        ? new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          )
        : new monaco.Range(position.lineNumber, 1, position.lineNumber, 1);

      return {
        range,
        contents: [hoverContent],
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('StreamlangHoverProvider: Error providing hover', error);
      return null;
    }
  }

  private buildHoverContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    yamlDocument: YAML.Document
  ): ActionHoverContext | null {
    try {
      // Get the line content
      const lineContent = model.getLineContent(position.lineNumber);

      // Check if we're on an action line
      const actionMatch = lineContent.match(/action:\s*(\w+)/);
      if (!actionMatch) {
        return null;
      }

      const actionType = actionMatch[1];

      return {
        actionType,
        yamlPath: [],
        currentValue: actionType,
        position,
        model,
        yamlDocument,
      };
    } catch (error) {
      return null;
    }
  }
}

/**
 * Create a new instance of the Streamlang hover provider
 */
export function createStreamlangHoverProvider(): monaco.languages.HoverProvider {
  return new StreamlangHoverProvider();
}
