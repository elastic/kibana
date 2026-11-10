/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import { PARSE_MERMAID_TOOL_ID } from '../../../common/impact_map/constants';
import { parseMermaid } from '../../../common/impact_map/mermaid';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';

const MAX_MERMAID_LENGTH = 50_000;

const DESCRIPTION =
  'Read a Mermaid diagram (flowchart or graph, architecture-beta, sequenceDiagram) found in a runbook, README, RCA or design doc into impact map entities and relationships. ' +
  'Nodes become entities with a guessed type from their shape and words, subgraphs become parents (`parent_id`), edge labels become relationship labels, thick edges are marked on the critical path, dotted edges are `inferred`, and classes and colours become health. ' +
  'Everything it returns has `source: "diagram"`: a diagram is what someone drew, so check it against telemetry or config before relying on it, then correct types, add what it leaves out and send the result to `agentic_investigations.set_impact_map`. ' +
  'It records nothing itself. `warnings` lists what it could not read.';

/** `agentic_investigations.parse_mermaid`: turns a Mermaid diagram into map parts, writes nothing. */
export const createParseMermaidTool = ({
  privileges,
  logger,
}: {
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: PARSE_MERMAID_TOOL_ID,
    description: DESCRIPTION,
    schema: z.object({
      mermaid: z
        .string()
        .min(1)
        .max(MAX_MERMAID_LENGTH)
        .describe('The diagram text, with or without its ```mermaid fence.'),
    }),
    annotations: {
      title: 'Read a Mermaid Diagram',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanRead(request),
    logger,
    handler: async ({ mermaid }) => ({ results: [createOtherResult(parseMermaid(mermaid))] }),
  });
