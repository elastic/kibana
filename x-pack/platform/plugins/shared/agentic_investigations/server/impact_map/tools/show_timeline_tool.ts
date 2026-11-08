/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import {
  SHOW_TIMELINE_TOOL_ID,
  TIMELINE_ATTACHMENT_TYPE,
} from '../../../common/impact_map/constants';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';

const DESCRIPTION =
  "Shows the investigation's timeline in the chat as a card. Call it when the user asks for the " +
  'timeline, what happened and when, or the sequence of events, then render the attachment it ' +
  'returns with <render_attachment id="ATTACHMENT_ID" /> on its own line. It shows the events ' +
  'already recorded with `agentic_investigations.set_impact_map`; record any missing ones first.';

export const createShowTimelineTool = ({
  privileges,
  logger,
}: {
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: SHOW_TIMELINE_TOOL_ID,
    description: DESCRIPTION,
    schema: z.object({}),
    annotations: {
      title: 'Show Investigation Timeline',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanRead(request),
    logger,
    handler: async (_input, { context: { attachments }, conversationId }) => {
      const attachment = await attachments.add({
        type: TIMELINE_ATTACHMENT_TYPE,
        data: { conversationId },
        description: 'Investigation timeline',
      });
      return { results: [createOtherResult({ attachment_id: attachment.id })] };
    },
  });
