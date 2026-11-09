/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { TIMELINE_ATTACHMENT_TYPE } from '../../../common/impact_map/constants';

const timelineDataSchema = lazySchema(() => z.object({ conversationId: z.string() }));

/**
 * `investigation_timeline`: only names the investigation. The card reads the recorded events when
 * it renders, so it always shows the latest timeline.
 */
export const registerTimelineAttachment = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.attachments.registerType({
    id: TIMELINE_ATTACHMENT_TYPE,
    validate: (input: unknown) => {
      const result = timelineDataSchema.safeParse(input);
      return result.success
        ? { valid: true as const, data: result.data }
        : { valid: false as const, error: result.error.message };
    },
    format: () => ({
      getRepresentation: () => ({
        type: 'text' as const,
        value: 'The investigation timeline card, showing every recorded event in time order.',
      }),
    }),
    getAgentDescription: () =>
      'A card with the investigation timeline. Render it with <render_attachment id="ATTACHMENT_ID" /> ' +
      'when the user asks for the timeline; do not retype the events.',
  } as Parameters<typeof agentBuilder.attachments.registerType>[0]);
};
