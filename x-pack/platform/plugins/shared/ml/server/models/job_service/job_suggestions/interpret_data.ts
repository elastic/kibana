/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { createInterpretDataPrompt } from './prompts';
import type { DataProfile } from './schemas';
import { dataProfileSchema } from './schemas';
import type { IndexEvidence } from './types';

/**
 * Asks the model what the data represents and which behaviours are worth watching.
 * This stands in for the questions an ML expert would ask the owner of the data.
 */
export const interpretData = async ({
  model,
  evidence,
}: {
  model: ScopedModel;
  evidence: IndexEvidence;
}): Promise<DataProfile> =>
  model.chatModel
    .withStructuredOutput(dataProfileSchema, { name: 'describe_data' })
    .invoke(createInterpretDataPrompt(evidence));
