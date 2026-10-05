/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import { MAX_EVIDENCE_SHORT_TEXT_LENGTH, MAX_EVIDENCE_TEXT_LENGTH } from '../../../common/evidence';
import {
  MAX_COMPONENT_DIAGRAM_MERMAID_LENGTH,
  MAX_COMPONENT_DIAGRAM_PROBLEM_NODES,
  SET_COMPONENT_DIAGRAM_TOOL_ID,
} from '../../../common/component_diagram/constants';
import { parseMermaidFlowchart } from '../../../common/component_diagram/parse_mermaid_flowchart';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import type { ComponentDiagramService } from '../services/component_diagram_service';

export const setComponentDiagramToolSchema = z.object({
  title: z
    .string()
    .max(MAX_EVIDENCE_SHORT_TEXT_LENGTH)
    .optional()
    .describe('A short title, for example "Checkout request path".'),
  mermaid: z
    .string()
    .min(1)
    .max(MAX_COMPONENT_DIAGRAM_MERMAID_LENGTH)
    .describe(
      'A Mermaid `flowchart` (starting with `flowchart LR` or `flowchart TD`) of the components involved, without code fences. ' +
        'One node per service, process, datastore, queue, or host (`id[Label]`, `id[(Database)]`, `id([External])`), ' +
        'and one edge per interaction, labeled with what flows (`a -->|HTTP /checkout| b`). Use `-.->` for an interaction that is failing or degraded. ' +
        'Group with `subgraph`. Keep it to the components that matter, at most about 15 nodes.'
    ),
  problem_node_ids: z
    .array(z.string().min(1).max(128))
    .max(MAX_COMPONENT_DIAGRAM_PROBLEM_NODES)
    .optional()
    .describe(
      'Ids of the nodes where the problem is (the root cause first). They are highlighted.'
    ),
  description: z
    .string()
    .max(MAX_EVIDENCE_TEXT_LENGTH)
    .optional()
    .describe(
      'What the problem is and how it spreads through the components. Markdown, a few sentences.'
    ),
});

export type SetComponentDiagramToolParams = z.infer<typeof setComponentDiagramToolSchema>;

const DESCRIPTION =
  'Record the component diagram of the investigation: a Mermaid flowchart of the services, processes, or other components involved, how they interact, and which of them the problem is in. ' +
  'Each call replaces the stored diagram. Call it once the components and the failing interaction are known, and again when the picture changes. ' +
  'It does not end the investigation; keep working after calling it.';

export const REMOVED_COMPONENT_DIAGRAM_ATTACHMENT_NOTE =
  'The user removed the component diagram attachment from this conversation. The diagram was recorded but is not shown in the conversation.';

/** Problems with the diagram the agent should fix; empty when it renders as sent. */
export const getComponentDiagramWarnings = ({
  mermaid,
  problem_node_ids: problemNodeIds = [],
}: Pick<SetComponentDiagramToolParams, 'mermaid' | 'problem_node_ids'>): string[] => {
  const chart = parseMermaidFlowchart(mermaid);
  if (!chart || chart.nodes.length === 0) {
    return [
      'The diagram is not a Mermaid flowchart with nodes, so it cannot be drawn. Start it with `flowchart LR` and send a corrected diagram.',
    ];
  }
  const nodeIds = new Set(chart.nodes.map(({ id }) => id));
  const unknown = problemNodeIds.filter((id) => !nodeIds.has(id));
  return [
    ...(chart.skipped.length > 0
      ? [
          `These lines could not be read and are not drawn: ${chart.skipped
            .slice(0, 5)
            .map((line) => JSON.stringify(line))
            .join(', ')}. Use plain flowchart nodes and edges.`,
        ]
      : []),
    ...(unknown.length > 0
      ? [`problem_node_ids name nodes the diagram does not have: ${unknown.join(', ')}.`]
      : []),
  ];
};

/** `investigations.set_component_diagram`: the agent's write path for the component diagram. */
export const createSetComponentDiagramTool = ({
  getComponentDiagramService,
  resolveUser,
  privileges,
  logger,
}: {
  getComponentDiagramService: () => ComponentDiagramService;
  resolveUser: ResolveUser;
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: SET_COMPONENT_DIAGRAM_TOOL_ID,
    description: DESCRIPTION,
    schema: setComponentDiagramToolSchema,
    annotations: {
      title: 'Set Investigation Component Diagram',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanManage(request),
    logger,
    handler: async (params, { context, conversationId }) => {
      const { title, mermaid, problem_node_ids: problemNodeIds, description } = params;
      const user = await resolveUser(context.request);
      const { document, attachment } = await getComponentDiagramService().setFromTool({
        context,
        conversationId,
        diagram: {
          ...(title !== undefined && { title }),
          mermaid,
          ...(problemNodeIds !== undefined && { problemNodeIds }),
          ...(description !== undefined && { description }),
        },
        user,
      });

      const notes = [
        ...getComponentDiagramWarnings(params),
        ...(attachment === 'removed_by_user' ? [REMOVED_COMPONENT_DIAGRAM_ATTACHMENT_NOTE] : []),
      ];

      return {
        results: [
          createOtherResult({
            acknowledged: true,
            attachment_id: document.id,
            ...(notes.length > 0 && { warning: notes.join(' ') }),
          }),
        ],
      };
    },
  });
