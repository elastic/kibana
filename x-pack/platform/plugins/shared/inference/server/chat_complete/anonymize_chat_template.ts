/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationOutput, ChatCompleteTemplate } from '@kbn/inference-common';
import { createInferenceInternalError, MessageRole } from '@kbn/inference-common';
import { applyStringReplacements, flattenJsonStrings } from '@kbn/ai-anonymization-server';
import { prepareAnonymization } from './prepare_anonymization';

type PrepareAnonymizationOptions = Parameters<typeof prepareAnonymization>[0];

/**
 * Template controls the gateway schema checks exactly. A hostname rule must not
 * rewrite `field_syntax`, and `phase` is an enum, not alert text.
 */
const PRESERVED_TEMPLATE_VARIABLE_PATHS = new Set(['/field_syntax', '/phase']);

/** JSON Pointer paths whose string values should be masked. */
export const templateVariablePathsToAnonymize = (flattened: Record<string, string>): string[] =>
  Object.keys(flattened).filter((path) => !PRESERVED_TEMPLATE_VARIABLE_PATHS.has(path));

/**
 * Masks string leaves in a prompt template's variables with the same rules as chat messages.
 */
export const anonymizeChatTemplate = async ({
  template,
  ...anonymizationOptions
}: { template: ChatCompleteTemplate } & Omit<
  PrepareAnonymizationOptions,
  'messages' | 'system'
>): Promise<{
  template: ChatCompleteTemplate;
  anonymization: AnonymizationOutput;
}> => {
  const flattened = flattenJsonStrings(template.variables);
  const paths = templateVariablePathsToAnonymize(flattened);

  if (paths.length === 0) {
    return {
      template,
      anonymization: { messages: [], anonymizations: [] },
    };
  }

  const { anonymization, replacementsId } = await prepareAnonymization({
    ...anonymizationOptions,
    messages: paths.map((path) => ({
      role: MessageRole.User,
      content: flattened[path],
    })),
  });

  const replacements: Record<string, string> = {};
  paths.forEach((path, index) => {
    const message = anonymization.messages[index];
    if (!message || message.role !== MessageRole.User || typeof message.content !== 'string') {
      throw createInferenceInternalError('Anonymized template variable was not a string');
    }
    replacements[path] = message.content;
  });

  return {
    template: {
      id: template.id,
      version: template.version,
      variables: applyStringReplacements(template.variables, replacements),
    },
    anonymization: {
      messages: [],
      anonymizations: anonymization.anonymizations,
      replacementsId,
    },
  };
};
