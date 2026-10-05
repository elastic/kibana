/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Attachment type identifier registered with Agent Builder. */
export const COMPONENT_DIAGRAM_ATTACHMENT_TYPE = 'investigation_component_diagram' as const;

/** One document per space and conversation. See README "Index naming". */
export const COMPONENT_DIAGRAM_INDEX_NAME = '.kibana-investigation-component-diagram' as const;

/** Bound on the Mermaid source of one diagram. */
export const MAX_COMPONENT_DIAGRAM_MERMAID_LENGTH = 10_000;

/** Components one diagram may mark as where the problem is. */
export const MAX_COMPONENT_DIAGRAM_PROBLEM_NODES = 20;

/** Agent Builder builtin tool that records an investigation's component diagram. */
export const SET_COMPONENT_DIAGRAM_TOOL_ID = 'investigations.set_component_diagram' as const;
