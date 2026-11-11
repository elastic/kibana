/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  OBSERVABLE_ATTACHMENT_TYPE,
  observableAttachmentDataSchema,
  type ObservableAttachmentData,
} from '../../../common/types/agent_builder/attachment_schemas';

/** What the agent reads: the observable, its case, and the metadata shared across cases. */
export const formatObservableDescription = (data: ObservableAttachmentData): string => {
  const metadataPairs = Object.entries(data.metadata ?? {}).map(
    ([key, value]) => `${key}=${value}`
  );
  return [
    `Observable ${data.type_label ?? data.type_key} "${data.value}" (type key ${data.type_key})`,
    `in case "${data.case_title}" (id ${data.case_id}, owner=${data.owner}).`,
    data.description ? `Description in this case: ${data.description}.` : undefined,
    metadataPairs.length > 0
      ? `Metadata shared by every case in the space holding this value: ${metadataPairs.join(
          ', '
        )}.`
      : undefined,
  ]
    .filter((part): part is string => part != null)
    .join(' ');
};

export const createObservableAttachmentType = (): AttachmentTypeDefinition<
  typeof OBSERVABLE_ATTACHMENT_TYPE,
  ObservableAttachmentData
> => ({
  id: OBSERVABLE_ATTACHMENT_TYPE,

  validate: (input) => {
    const result = observableAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatObservableDescription(attachment.data),
    }),
  }),

  getAgentDescription: () =>
    'An observable (an indicator such as an IP address, domain, hash or URL) of an Elastic case: its type, value and description in that case, the case it belongs to, and the metadata shared by every case in the space that holds the same value. Use the cases tools with the case id to look at the case and its other observables.',
});
