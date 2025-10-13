/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/onechat-common';
import type { OnechatStartDependencies } from '../../types';

/**
 * Configuration for a custom markdown element
 */
export interface CustomElementConfig {
  /**
   * Tag name for the custom element (e.g., 'visualization', 'custom-widget')
   * Must be kebab-case and unique
   */
  tagName: string;

  /**
   * Attribute names that should be extracted from the element
   * Example: { toolResultId: 'tool-result-id', chartType: 'chart-type' }
   */
  attributes: Record<string, string>;

  /**
   * Factory function that creates the renderer component
   */
  rendererFactory: RendererFactory;
}

/**
 * Context provided to renderer factories
 */
export interface RendererContext {
  /**
   * Steps from the current conversation round
   */
  stepsFromCurrentRound: ConversationRoundStep[];

  /**
   * Steps from previous conversation rounds
   */
  stepsFromPrevRounds: ConversationRoundStep[];

  /**
   * Start dependencies (lens, dataViews, uiActions, etc.)
   */
  startDependencies: OnechatStartDependencies;
}

/**
 * Generic element attributes extracted from the markdown
 */
export type ElementAttributes = Record<string, string | undefined>;

/**
 * Factory function that creates a renderer component with access to conversation context
 */
export type RendererFactory = (
  context: RendererContext
) => (props: ElementAttributes) => React.ReactElement | null;

/**
 * Markdown parser plugin type (from unified)
 */
export type MarkdownParser = (tree: any) => void;
