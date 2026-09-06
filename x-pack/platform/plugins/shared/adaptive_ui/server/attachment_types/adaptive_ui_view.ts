/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  AttachmentValidationResult,
} from '@kbn/agent-builder-server/attachments';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { parseViewSpec, renderText, type ViewSpec } from '@kbn/adaptive-ui';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, adaptiveUiTools } from '../../common/constants';
import { viewRendererTypeDefinition } from '../renderers/view_renderer';

// `parseViewSpec` runs the same `viewSpecSchema` the `view` renderer uses as its
// `payloadSchema`, so the attachment and the renderer accept identical payloads,
// and narrows the loose parse result to a typed `ViewSpec`.
const validate = (input: unknown): AttachmentValidationResult<ViewSpec> => {
  const parsed = parseViewSpec(input);
  if (parsed.valid && parsed.spec) {
    return { valid: true, data: parsed.spec };
  }
  return { valid: false, error: parsed.errors.join('; ') };
};

export const adaptiveUiViewAttachmentType: AttachmentTypeDefinition<
  typeof ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
  ViewSpec
> = {
  id: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
  validate,
  format: (attachment) => ({
    getRepresentation: () => ({ type: 'text' as const, value: renderText(attachment.data) }),
  }),
  getTools: () => [adaptiveUiTools.renderView],
  // The ViewSpec/schema description is owned by the `view` renderer; the
  // attachment only adds its inline-in-chat invocation semantics.
  getAgentDescription: () =>
    `${viewRendererTypeDefinition.getAgentDescription?.() ?? ''}\n` +
    `${ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE} attachments show such a view inline in chat; the card is shown to the user directly — do NOT restate its content as prose.\n` +
    `Use the \`${adaptiveUiTools.renderView}\` tool to create one from a ViewSpec.`,
};

export const registerAdaptiveUiViewAttachment = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.attachments.registerType(
    adaptiveUiViewAttachmentType as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
};
