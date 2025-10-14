/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/onechat-common';
import type { ResolvedConfiguration } from '../types';

export const resolveConfiguration = (configuration: AgentConfiguration): ResolvedConfiguration => {
  let researchInstructions = configuration.research?.instructions ?? '';
  let answerInstructions = configuration.answer?.instructions ?? '';
  if (configuration.instructions) {
    researchInstructions = researchInstructions
      ? `${researchInstructions}\n${configuration.instructions}`
      : configuration.instructions;
    answerInstructions = answerInstructions
      ? `${answerInstructions}\n${configuration.instructions}`
      : configuration.instructions;
  }

  return {
    research: {
      instructions: researchInstructions,
    },
    answer: {
      instructions: answerInstructions,
    },
  };
};
