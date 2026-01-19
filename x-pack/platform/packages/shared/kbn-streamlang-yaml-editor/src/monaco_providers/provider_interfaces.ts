/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type YAML from 'yaml';
import type { monaco } from '@kbn/monaco';

/**
 * Context information for hover providers
 */
export interface ActionHoverContext {
  /** The action type (e.g., "grok", "dissect", "set") */
  actionType: string;
  /** YAML path segments to the current position */
  yamlPath: string[];
  /** Current value at the cursor position */
  currentValue: string;
  /** Monaco editor position */
  position: monaco.Position;
  /** Monaco editor model */
  model: monaco.editor.ITextModel;
  /** YAML document */
  yamlDocument: YAML.Document;
}
