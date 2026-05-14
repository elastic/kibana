/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const buildFormPromptsRequestSchema = () => ({
  form_prompts: schema.maybe(
    schema.arrayOf(
      schema.object({
        execution_id: schema.string({
          meta: { description: 'Workflow execution ID to resume.' },
        }),
        id: schema.string({
          meta: { description: 'ID matching the form prompt request.' },
        }),
        values: schema.recordOf(schema.string(), schema.any(), {
          meta: { description: 'Submitted form values.' },
        }),
        expected_resume_seq: schema.maybe(
          schema.number({
            min: 1,
            meta: {
              description:
                'Optional client-asserted resume sequence (server CAS guard). Currently informational; server reads pending_prompts.resume_seq as the authoritative source.',
            },
          })
        ),
      }),
      {
        meta: {
          description:
            'Can be used to respond to a form prompt. Values are routed directly to resumeWorkflowExecution without an LLM hop.',
        },
      }
    )
  ),
});
