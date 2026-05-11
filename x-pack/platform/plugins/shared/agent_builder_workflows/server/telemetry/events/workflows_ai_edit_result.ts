/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/server';

export const WORKFLOWS_AI_EDIT_RESULT_EVENT_TYPE = 'workflows_ai_edit_result';

export interface WorkflowsAiEditResultParams {
  /** The edit tool ID (e.g., 'workflows.workflow_insert_step') */
  tool_id: string;
  /** Conversation ID from the agent execution context */
  conversation_id?: string;
  /** Whether the YAML manipulation itself succeeded */
  edit_success: boolean;
  /** Whether the resulting YAML passed server-side validation. Only present when edit_success is true. */
  validation_passed?: boolean;
  /** Number of validation errors. Only present when edit_success is true. */
  validation_error_count?: number;
  /** Whether this edit created a new workflow (setYaml with no prior attachment) */
  is_creation: boolean;
  /**
   * True when this tool call produced a valid result and the previous edit tool call
   * in the same conversation failed validation — indicates the AI self-corrected.
   */
  is_self_correction?: boolean;
}

export const workflowsAiEditResultSchema: RootSchema<WorkflowsAiEditResultParams> = {
  tool_id: {
    type: 'keyword',
    _meta: {
      description: 'The edit tool ID (e.g., workflows.workflow_insert_step)',
      optional: false,
    },
  },
  conversation_id: {
    type: 'keyword',
    _meta: {
      description: 'Conversation ID from the agent execution context',
      optional: true,
    },
  },
  edit_success: {
    type: 'boolean',
    _meta: {
      description: 'Whether the YAML manipulation itself succeeded',
      optional: false,
    },
  },
  validation_passed: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the resulting YAML passed server-side validation. Only present when edit_success is true.',
      optional: true,
    },
  },
  validation_error_count: {
    type: 'integer',
    _meta: {
      description: 'Number of validation errors. Only present when edit_success is true.',
      optional: true,
    },
  },
  is_creation: {
    type: 'boolean',
    _meta: {
      description: 'Whether this edit created a new workflow (setYaml with no prior attachment)',
      optional: false,
    },
  },
  is_self_correction: {
    type: 'boolean',
    _meta: {
      description:
        'True when this tool call produced a valid result and the previous edit tool call in the same conversation failed validation',
      optional: true,
    },
  },
};
