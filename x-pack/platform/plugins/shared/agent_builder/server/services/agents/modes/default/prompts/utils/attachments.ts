/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessedAttachmentType } from '../../../utils/prepare_conversation';

export const attachmentTypeInstructions = (attachmentTypes: ProcessedAttachmentType[]): string => {
  if (attachmentTypes.length === 0) {
    return '';
  }

  const perTypeInstructions = attachmentTypes.map(({ type, description }) => {
    return `### ${type} attachments

${description ?? 'No instructions available.'}`;
  });

  return `## ATTACHMENT TYPES

  The current conversation contains attachments. Here is the list of attachment types present in the conversation and their corresponding description:

${perTypeInstructions.join('\n\n')}
  `;
};
