import React from 'react';
import type { YamlRuleEditorProps } from './types';
/**
 * YAML Rule Editor component with ES|QL support
 *
 * This component provides a Monaco-based code editor for editing rule definitions
 * in YAML format with embedded ES|QL query support, including:
 * - Syntax highlighting for both YAML and ES|QL
 * - Auto-completion for YAML keys based on the rule schema
 * - ES|QL auto-completion within the query field
 * - Real-time validation against the rule schema
 */
export declare const YamlRuleEditor: React.FC<YamlRuleEditorProps>;
