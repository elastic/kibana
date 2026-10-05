/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  COMPONENT_DIAGRAM_ATTACHMENT_TYPE,
  COMPONENT_DIAGRAM_INDEX_NAME,
  MAX_COMPONENT_DIAGRAM_MERMAID_LENGTH,
  MAX_COMPONENT_DIAGRAM_PROBLEM_NODES,
  SET_COMPONENT_DIAGRAM_TOOL_ID,
} from './constants';

export { investigationComponentDiagramSchema } from './component_diagram';

export type { InvestigationComponentDiagram } from './component_diagram';
