/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspect } from 'util';
import { get } from 'lodash';
import {
  getUsefulTokens,
  getReviewFields,
  formatRoot,
} from '../../../shared/processing/templatize/format_root';
import { OnboardingTaskContext, OnboardingTaskState } from '../types';
import { ReviewFieldsPrompt } from './prompts';
import { extractTemplate } from '../../../shared/processing/templatize';

export async function generateParsers({
  context,
  state,
  state: {
    stream: { definition },
    dataset: { samples },
  },
}: {
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
}): Promise<OnboardingTaskState> {
  const [firstSample] = samples;
  const fieldName = get(firstSample._source, 'body.text') ? 'body.text' : 'message';
  const messages = samples.reduce<string[]>((acc, hit) => {
    const value = get(hit._source, fieldName);
    if (typeof value === 'string') {
      acc.push(value);
    }
    return acc;
  }, []);

  if (messages.length === 0) {
    throw new Error(`No messages found in the dataset for stream ${state.stream.definition.name}`);
  }

  const { roots, delimiter } = await extractTemplate(messages).catch((error) => {
    throw new Error(`Template extraction for ${state.stream.definition.name} timed out`, {
      cause: error,
    });
  });

  const { usefulColumns, usefulTokens } = getUsefulTokens(roots, delimiter);
  const templateExtraction = formatRoot(roots, delimiter);

  const { grok, display } = templateExtraction.formatted;

  context.logger.info(JSON.stringify({ grok, delimiter }));

  const formatDescription = await context.inferenceClient.prompt({
    prompt: ReviewFieldsPrompt,
    input: {
      sample_messages: messages.slice(0, 5),
      review_fields: JSON.stringify(getReviewFields(usefulColumns, 5)),
    },
  });

  context.logger.info(formatDescription.content);

  const initial = await context.services.processing
    .simulate(state.stream.definition.name, {
      samples: state.dataset.samples,
      processor: {
        id: 'initial',
        grok: {
          field: fieldName,
          patterns: [grok],
        },
      },
    })
    .catch((error) => {
      return {
        result: {
          failure_rate: 1,
          errors: [error],
        },
      };
    });

  context.logger.info(inspect(initial.result, { depth: null }));

  return state;
}
