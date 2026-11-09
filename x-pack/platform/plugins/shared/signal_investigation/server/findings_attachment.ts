/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
  formatSignalInvestigationFindingsForAgent,
  signalInvestigationFindingsAttachmentSchema,
  type SignalInvestigationFindingsAttachmentData,
} from '../common/findings_attachment';

/** Creates the server-side Agent Builder attachment definition for signal investigation findings. */
export const createSignalInvestigationFindingsAttachmentType = (): AttachmentTypeDefinition<
  typeof SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
  SignalInvestigationFindingsAttachmentData
> => ({
  id: SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
  isReadonly: true,
  validate: (input) => {
    const parsed = signalInvestigationFindingsAttachmentSchema.safeParse(input);
    if (!parsed.success) {
      return { valid: false, error: parsed.error.message };
    }
    return { valid: true, data: parsed.data };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const parsed = signalInvestigationFindingsAttachmentSchema.safeParse(attachment.data);
      if (!parsed.success) {
        throw new Error(`Invalid signal investigation findings attachment ${attachment.id}`);
      }
      return {
        type: 'text',
        value: formatSignalInvestigationFindingsForAgent(parsed.data),
      };
    },
  }),
  getAgentDescription: () =>
    'Deterministic signal investigation findings containing the investigation seed, the analysis coverage plan, and the top ranked leads. These findings are statistical observations rather than confirmed causes and should be verified with existing tools.',
});
