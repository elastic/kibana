/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_EVIDENCE_SHORT_TEXT_LENGTH, MAX_EVIDENCE_TEXT_LENGTH } from '../evidence/evidence';
import { userSchema } from '../user';
import {
  MAX_COMPONENT_DIAGRAM_MERMAID_LENGTH,
  MAX_COMPONENT_DIAGRAM_PROBLEM_NODES,
} from './constants';

const MAX_ID_LENGTH = 256;
const MAX_NODE_ID_LENGTH = 128;
const MAX_TIMESTAMP_LENGTH = 64;

/** Stored component diagram document, replaced on every write. */
export const investigationComponentDiagramSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  title: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH).optional(),
  /** A Mermaid `flowchart` of the components and how they interact. */
  mermaid: z.string().min(1).max(MAX_COMPONENT_DIAGRAM_MERMAID_LENGTH),
  /** Ids of the Mermaid nodes where the problem is. */
  problemNodeIds: z
    .array(z.string().min(1).max(MAX_NODE_ID_LENGTH))
    .max(MAX_COMPONENT_DIAGRAM_PROBLEM_NODES)
    .optional(),
  /** What the problem is and how it spreads through the components. Markdown. */
  description: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: userSchema.optional(),
  updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
});
export type InvestigationComponentDiagram = z.infer<typeof investigationComponentDiagramSchema>;
