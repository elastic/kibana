/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { renderPrompt, toolSchema } from '../../src/prompt';
import {
  BASE_SYSTEM_PROMPT,
  NO_LIST_SUFFIX,
  WITH_LIST_SUFFIX,
  MONITOR_ID_DESCRIPTION,
} from './prompt';
import type { MonitorExample, MonitorOutput } from './types';

const outputSchema = z.object({ monitor_id: z.string().describe(MONITOR_ID_DESCRIPTION) });

/** Runs the verbatim monitor-id reference prompt in one structured-output call. */
export const runTask = async (
  inferenceClient: Pick<BoundInferenceClient, 'output'>,
  input: MonitorExample['input']
): Promise<MonitorOutput> => {
  const monitors = input.existing_monitors;
  const rows = monitors?.map((monitor) => {
    const [id, symptom] = Array.isArray(monitor) ? monitor : [monitor.monitor_id, monitor.symptom];
    return `| ${id} | ${symptom} |`;
  });
  const suffix = rows?.length
    ? renderPrompt(WITH_LIST_SUFFIX, {
        monitor_id_table: `| monitor_id | symptom |\n|------------|---------|\n${rows.join('\n')}`,
      })
    : NO_LIST_SUFFIX;
  try {
    const response = await inferenceClient.output({
      id: 'monitor_id_extraction',
      system: BASE_SYSTEM_PROMPT + suffix,
      input: input.user_message ?? '',
      schema: toolSchema(outputSchema),
    });
    const parsed = outputSchema.safeParse(response.output);
    return { monitor_id: parsed.success ? parsed.data.monitor_id.trim() : '' };
  } catch (error) {
    return { monitor_id: '', error: error instanceof Error ? error.message : String(error) };
  }
};
