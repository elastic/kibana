/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputSchema } from '../../../../common/steps/ai/ai_classify_step';

export function convertOutputToModelResponseSchema(output: typeof OutputSchema) {
  return output.omit({ metadata: true });
}

export const ModelResponseSchema = convertOutputToModelResponseSchema(OutputSchema);
